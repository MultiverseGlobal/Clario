import { useParams } from "react-router-dom";

export default function PublicProfile() {
  const { handle } = useParams();
  
  return (
    <div className="flex h-screen w-full items-center justify-center p-6">
      <div className="max-w-3xl space-y-4 text-center">
        <h1 className="text-3xl font-bold">@{handle}</h1>
        <p className="text-muted-foreground">
          Public profile is currently under construction.
        </p>
      </div>
    </div>
  );
}
