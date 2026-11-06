# Android CI / Google Play internal testing

## Pipeline

- Pull requests and pushes to `master`, `main`, `develop`, or `codex/**`: install the frozen pnpm lockfile, execute `pnpm test`, and export the Android JavaScript bundle.
- Push a `play-v*` tag, or manually run **Google Play Internal**: pass the same CI checks, build a signed production AAB on EAS, then submit that exact build ID to Google Play's **internal** track.
- Releases are serialized. EAS manages Android version codes remotely and increments them for production builds. A failed build or submission fails the workflow.
- This pipeline does not publish a production store release.

## Required configuration

1. Add an Expo access token as the GitHub Actions secret `EXPO_TOKEN` in the repository or its `google-play-internal` environment. The account must have access to `minari0120/webee-mo`.
2. In Expo, configure the existing Android upload keystore for `com.webee.mo`. Reuse the upload certificate registered with Google Play; do not replace an existing signing identity.
3. Assign a Google Play service-account key to this Android application in Expo Credentials. Grant the account access to this application and testing releases in Play Console. `eas submit` uses this stored credential; no JSON key is committed to Git.
4. In the EAS `production` environment, set `GOOGLE_SERVICES_JSON` as a **file** variable containing the Firebase Android `google-services.json` for `com.webee.mo`. This is different from the Google Play service-account key. Production cloud builds fail if the Firebase file is missing.
5. Populate the `EXPO_PUBLIC_*` values read by `app.config.js` in that EAS environment. Local `.env` is not uploaded. Public values are included in the application bundle.
6. Before the first automated release, check the highest version code in Play Console and use `eas build:version:set --platform android --profile production` to seed the remote value if necessary. Keep it at least as high as any previously uploaded version. This cannot be verified from source.
7. Create the app in Play Console and complete required app declarations. If Google rejects API submission before the first manual upload or while the app is in draft, complete the initial release setup in Play Console, then retry.

## Trigger

Once the workflow is merged into the repository's default branch, run **Google Play Internal** from Actions on the desired reviewed branch. Before that merge, or for a tagged release, push a tag pointing to a commit containing the workflows:

```sh
git tag play-v1.0.1-1
git push origin play-v1.0.1-1
```

Select the intended release commit before tagging. The workflow never uses `--latest`: it submits only the build created by that run.

## Verification limits

- Node tests cover selected logic and API contracts. They do not exercise physical NFC, Wi-Fi provisioning, notification delivery, or complete screen interactions.
- The Android export checks JavaScript bundling; the EAS job checks native compilation and signing.
- A successful submission establishes Play upload completion. Confirm the internal release and tester installation in Play Console.
- Full TypeScript checking is not a CI gate yet; existing project diagnostics must be resolved before adding that gate.

References: [Expo Submit](https://docs.expo.dev/submit/android/), [remote app versions](https://docs.expo.dev/build-reference/app-versions/), [EAS environment variables](https://docs.expo.dev/eas/environment-variables/).
