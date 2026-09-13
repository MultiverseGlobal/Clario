import ast
import builtins

class Checker(ast.NodeVisitor):
    def __init__(self):
        self.scopes = [set(dir(builtins))]
        self.scopes[-1].update(['__file__', '__name__', '__doc__'])
        self.errors = []
        
    def visit_FunctionDef(self, node):
        self.scopes.append(set())
        for arg in node.args.args:
            self.scopes[-1].add(arg.arg)
        if node.args.vararg:
            self.scopes[-1].add(node.args.vararg.arg)
        if node.args.kwarg:
            self.scopes[-1].add(node.args.kwarg.arg)
        self.scopes[-2].add(node.name)
        self.generic_visit(node)
        self.scopes.pop()
        
    def visit_AsyncFunctionDef(self, node):
        self.visit_FunctionDef(node)
        
    def visit_ClassDef(self, node):
        self.scopes[-1].add(node.name)
        self.scopes.append(set())
        self.generic_visit(node)
        self.scopes.pop()
        
    def visit_Import(self, node):
        for alias in node.names:
            name = alias.asname or alias.name.split('.')[0]
            self.scopes[-1].add(name)
            
    def visit_ImportFrom(self, node):
        for alias in node.names:
            name = alias.asname or alias.name
            self.scopes[-1].add(name)
            
    def add_targets(self, target):
        if isinstance(target, ast.Name):
            self.scopes[-1].add(target.id)
        elif isinstance(target, ast.Tuple) or isinstance(target, ast.List):
            for elt in target.elts:
                self.add_targets(elt)

    def visit_Assign(self, node):
        for target in node.targets:
            self.add_targets(target)
        self.generic_visit(node)
        
    def visit_AnnAssign(self, node):
        self.add_targets(node.target)
        self.generic_visit(node)
        
    def visit_For(self, node):
        self.add_targets(node.target)
        self.generic_visit(node)
        
    def visit_AsyncFor(self, node):
        self.visit_For(node)

    def visit_With(self, node):
        for item in node.items:
            if item.optional_vars:
                self.add_targets(item.optional_vars)
        self.generic_visit(node)
        
    def visit_AsyncWith(self, node):
        self.visit_With(node)

    def visit_ExceptHandler(self, node):
        if node.name:
            self.scopes[-1].add(node.name)
        self.generic_visit(node)
        
    def visit_Lambda(self, node):
        self.scopes.append(set())
        for arg in node.args.args:
            self.scopes[-1].add(arg.arg)
        self.generic_visit(node)
        self.scopes.pop()
        
    def handle_comp(self, node):
        self.scopes.append(set())
        for gen in node.generators:
            self.add_targets(gen.target)
        self.generic_visit(node)
        self.scopes.pop()

    def visit_ListComp(self, node): self.handle_comp(node)
    def visit_SetComp(self, node): self.handle_comp(node)
    def visit_DictComp(self, node): self.handle_comp(node)
    def visit_GeneratorExp(self, node): self.handle_comp(node)

    def visit_Name(self, node):
        if isinstance(node.ctx, ast.Load):
            found = False
            for scope in reversed(self.scopes):
                if node.id in scope:
                    found = True
                    break
            if not found:
                self.errors.append((node.lineno, node.id))
        self.generic_visit(node)

with open('Clario/server/main.py', 'r') as f:
    tree = ast.parse(f.read())

checker = Checker()
checker.visit(tree)
for line, name in sorted(set(checker.errors)):
    print(f'Line {line}: Undefined name {name}')
