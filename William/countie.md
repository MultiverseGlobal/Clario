# Orion App — Continuation Notes

## Where We Left Off
Trying to install the custom native build of the Orion app onto a **Redmi 14C** Android phone so we can preview the new high-fidelity Skia graphics (the liquid orb logo and audio waveform visualizer).

---

## What's Been Done ?

1. **Full "Orion" Rebrand** — Every mention of "William" has been renamed to "Orion" across all `.ts`/`.tsx` files. The store was renamed from `useWilliamStore.ts` ? `useOrionStore.ts`.
2. **Skia Installed** — `@shopify/react-native-skia` was installed via `npx expo install`.
3. **`OrionLogo.tsx`** — New Skia-powered fluid orb logo (replaces `ApertureLogo` everywhere: home screen, splash, onboarding, dock).
4. **`OrionAudioWave.tsx`** — New Skia-powered Bezier curve audio waveform visualizer on the home screen (replaces the old CSS aura blob).
5. **Java 17 installed** — Found at `C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot`. `JAVA_HOME` has been set permanently.
6. **TLS fix applied** — `android/gradle.properties` updated with `-Dhttps.protocols=TLSv1.2,TLSv1.3` to fix Gradle download failures.

---

## What's Blocking ?

`npx expo run:android` keeps failing because the Redmi 14C phone is not being detected by ADB.

Root cause: USB Debugging is either not enabled, phone is in Charging mode instead of File Transfer, or the "Allow USB Debugging?" popup was not tapped.

---

## Exact Next Steps to Continue

### Step 1 — Verify phone is connected
Run this in Powershell:
```powershell
adb devices
```
- If it shows `<device-id>  device` ? phone is ready, go to Step 2
- If it shows `unauthorized` ? look at phone and tap Allow on the USB debugging popup
- If it shows nothing ? phone is in Charging mode, swipe down and switch USB to File Transfer

### Step 2 — Run the build
```powershell
cd C:\Users\SUDO\Documents\Pseudonyms\William\apps\mobile
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
npx expo run:android
```
This will compile (~5-10 min) and install directly on the Redmi 14C.

### Step 3 — Test on device
- [ ] Splash screen shows the fluid Orion orb logo
- [ ] Home screen shows the Bezier audio wave (not a blurry circle)
- [ ] Tapping "tap to reflect" makes the wave pulse
- [ ] Nav dock shows the animated Orion orb in the center button

---

## Key Files Changed
| File | What Changed |
|------|-------------|
| `src/components/OrionLogo.tsx` | NEW - Skia fluid orb logo |
| `src/components/OrionAudioWave.tsx` | NEW - Skia audio waveform |
| `src/store/useOrionStore.ts` | Renamed from useWilliamStore.ts |
| `src/app/index.tsx` | Uses OrionLogo + OrionAudioWave |
| `src/components/ExecutiveDock.tsx` | Uses OrionLogo |
| `src/components/SplashEntry.tsx` | Uses OrionLogo |
| `src/app/onboarding.tsx` | Uses OrionLogo |
| `android/gradle.properties` | TLS fix added |
