# Internal / closed testing release — v1.0.4 (biometric login)

## Upload file
`06-release-bundle/eduaitor-internal-testing-v1.0.4-biometric.aab`

Also copied to:
`D:\Eduaitor\Frontend\eduaitor-v1.0.4-biometric.aab`

- Package: `eduaitor.app`
- Version code: `5`
- Version name: `1.0.4`
- Includes: device biometric login (fingerprint / face), SMS bug fixes, admission-number fix

## Steps in Play Console
1. Open app → **Testing** → **Internal testing** (or **Closed testing** if that is your tester track)
2. **Create new release**
3. Upload `eduaitor-internal-testing-v1.0.4-biometric.aab`
4. Release name: `1.0.4 (biometric)`
5. Release notes (en-US), for example:
   ```
   - Fingerprint / face unlock for faster login on this device
   - Student admission and class capacity fixes
   - Stability and toast improvements
   ```
6. **Next** → **Save** → **Review release** → **Start rollout to Internal testing**

## Testers
1. Testing track → **Testers** tab
2. Ensure your test email list is added
3. Share / open the **join link**, then install/update from Play Store

## Notes
- Keep `android/eduaitor-upload.jks` and `android/key.properties` safe for future updates.
- Testers already on Internal testing should see an update to **1.0.4**.
