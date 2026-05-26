# Security Specification - TNA DIGITAL OCR

## 1. Data Invariants
- A user profile must be linked to a valid authentication UID.
- A user cannot modify their own `plan` or `usageCount` unless they are an admin (though the app logic allows incrementing usage, from a security rule perspective, we usually want to restrict this or allow it specifically if the app is client-side only). Wait, the app is client-side only, so `incrementUsage` is called from the client. I must allow the client to increment it, but perhaps I should limit the increment to +1.
- Gemini API Keys should be protected and only accessible by the owner or admin.
- Plan settings are public for reading but only manageable by admins.

## 2. The "Dirty Dozen" Payloads (Target: users/{userId})

1. **Identity Spoofing**: Attempting to create a user profile for a different UID.
   - Payload: `{ email: 'victim@example.com', ... }` to `users/different_uid`
   - Result: `PERMISSION_DENIED`

2. **Ghost Field Injection**: Adding a field like `isAdmin: true` to the user profile.
   - Payload: `{ ..., isAdmin: true }`
   - Result: `PERMISSION_DENIED` (via `hasOnly` and strict schema)

3. **Plan Escalation**: A free user trying to update their plan to 'pro'.
   - Payload: `{ plan: 'pro' }`
   - Result: `PERMISSION_DENIED` (unless admin)

4. **Usage Count Reset**: A user trying to reset their `usageCount` to 0.
   - Payload: `{ usageCount: 0 }`
   - Result: `PERMISSION_DENIED`

5. **API Key Theft**: Unauthenticated user trying to read `users/some_uid`.
   - Result: `PERMISSION_DENIED`

6. **API Key Theft (Auth'd)**: Authenticated user trying to read `users/another_uid`.
   - Result: `PERMISSION_DENIED`

7. **Email Hijacking**: User trying to change their email in the document to something else.
   - Payload: `{ email: 'new@example.com' }`
   - Result: `PERMISSION_DENIED` (Immutable field check)

8. **Admin Privilege Escalation**: User trying to write to `plan_settings`.
   - Payload: `{ price: 'R$ 0,00' }`
   - Result: `PERMISSION_DENIED`

9. **Resource Exhaustion (ID Poisoning)**: Creating a document with a 1MB string as ID.
   - Result: `PERMISSION_DENIED` (via `isValidId`)

10. **Resource Exhaustion (Field Poisoning)**: Updating `displayName` with a 1MB string.
    - Result: `PERMISSION_DENIED` (via `size()` checks)

11. **Timestamp Spoofing**: Setting `updatedAt` to a future date instead of `request.time`.
    - Result: `PERMISSION_DENIED`

12. **Unverified Email Access**: Trying to perform admin actions without a verified email.
    - Result: `PERMISSION_DENIED`

## 3. The Test Runner 

(Simulated via logic validation in rules)
