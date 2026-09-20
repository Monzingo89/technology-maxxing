# Mobile projects

AI Space shares React/TypeScript screens and the Three.js world across web and Capacitor. Native iOS and Android project shells are generated. `npm run native:sync` builds and syncs both. iOS uses Swift Package Manager.

```bash
npm run native:sync
npx cap open ios
npx cap open android
```

## What still requires native work before submission

1. Confirm a final bundle/package ID, register Firebase iOS/Android apps, add the corresponding configuration files, and choose signing identities. The current `com.aispace.community` identifier is provisional.
2. Integrate and verify native Google OAuth. The web app currently uses Firebase popup sign-in; that is **not a verified native WebView sign-in implementation**. Use a native Firebase authentication bridge with a credential handoff to the JS auth instance. Add the provider URL schemes and Android SHA fingerprints.
3. Add an equivalent privacy-preserving sign-in option for iOS when required. Sign in with Apple is the usual solution when offering Google login. Configure revocation/deletion for linked providers. [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/)
4. Use native App Check attestation and bridge its token to callable requests. Web reCAPTCHA is not a verified native attestation solution.
5. Replace generated starter app icons/splash assets with final branded assets; test keyboard insets, safe areas, OS Back handling, state restoration, offline interruption, and accessibility on actual devices. Test the 3D view’s memory, thermal performance, and WebGL fallback.
6. Complete developer program accounts, signing/provisioning, screenshots, descriptions, privacy labels/Data safety, age rating, support URL, web account-deletion request route, reviewer access, moderation, and policy contacts.
7. Build and test signed iOS and Android releases. No native build, signing, device verification, TestFlight upload, Play upload, or store approval has been claimed.

The web experience and backend emulator contracts are verified separately. Native project synchronization confirms asset/package wiring, not store readiness. [Capacitor workflow](https://capacitorjs.com/docs/basics/workflow), [native Firebase auth integration](https://capawesome.io/docs/sdks/capacitor/firebase/authentication/)
