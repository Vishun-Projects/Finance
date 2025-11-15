# OAuth Setup Guide for Microsoft and Apple

This guide explains how to obtain OAuth credentials for Microsoft (Azure AD) and Apple Sign In.

## Microsoft OAuth (Azure AD) Setup

### Step 1: Create Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com/)
2. Sign in with your Microsoft account
3. Navigate to **Azure Active Directory** → **App registrations**
4. Click **New registration**

### Step 2: Configure App Registration

1. **Name**: Enter a name (e.g., "Vishnu Finance")
2. **Supported account types**: 
   - Choose **"Accounts in any organizational directory and personal Microsoft accounts"** (for public use)
   - Or **"Single tenant"** (for organization only)
3. **Redirect URI**:
   - Platform: **Web**
   - URI: 
     - Development: `http://localhost:3000/api/auth/oauth/microsoft/callback`
     - Production: `https://your-domain.com/api/auth/oauth/microsoft/callback`
4. Click **Register**

### Step 3: Get Credentials

After registration, you'll see the **Overview** page:

1. **Application (client) ID** → This is your `MICROSOFT_OAUTH_CLIENT_ID`
2. **Directory (tenant) ID** → This is your `MICROSOFT_OAUTH_TENANT_ID`
   - For public apps, you can use `"common"` instead

### Step 4: Create Client Secret

1. Go to **Certificates & secrets** in the left sidebar
2. Click **New client secret**
3. Enter a description (e.g., "Production Secret")
4. Choose expiration (recommended: 24 months)
5. Click **Add**
6. **IMPORTANT**: Copy the **Value** immediately (you won't see it again!)
   - This is your `MICROSOFT_OAUTH_CLIENT_SECRET`

### Step 5: Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Add these permissions:
   - `openid` (usually already added)
   - `email`
   - `profile`
6. Click **Add permissions**
7. **Grant admin consent** if required (for organization accounts)

### Step 6: Add Environment Variables

Add these to your `.env.local` (development) or Vercel environment variables:

```env
MICROSOFT_OAUTH_CLIENT_ID=your-client-id-here
MICROSOFT_OAUTH_CLIENT_SECRET=your-client-secret-here
MICROSOFT_OAUTH_TENANT_ID=common  # or your-tenant-id for single tenant
MICROSOFT_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/oauth/microsoft/callback  # Optional, auto-detected if not set
```

---

## Apple Sign In Setup

### Prerequisites

- Apple Developer Account ($99/year)
- Access to [Apple Developer Portal](https://developer.apple.com/)

### Step 1: Create App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+** (Add)
4. Select **App IDs** → **Continue**
5. Select **App** → **Continue**
6. Fill in:
   - **Description**: Your app name (e.g., "Vishnu Finance")
   - **Bundle ID**: Use reverse domain notation (e.g., `com.yourcompany.vishnufinance`)
7. Under **Capabilities**, check **Sign In with Apple**
8. Click **Continue** → **Register**

### Step 2: Create Services ID (for Web)

1. In **Identifiers**, click **+** again
2. Select **Services IDs** → **Continue**
3. Fill in:
   - **Description**: Your service name (e.g., "Vishnu Finance Web")
   - **Identifier**: Use reverse domain (e.g., `com.yourcompany.vishnufinance.web`)
4. Check **Sign In with Apple**
5. Click **Configure** next to "Sign In with Apple"
6. **Primary App ID**: Select the App ID you created in Step 1
7. **Website URLs**:
   - **Domains and Subdomains**: Your domain (e.g., `your-domain.com` or `localhost:3000` for dev)
   - **Return URLs**: 
     - Development: `http://localhost:3000/api/auth/oauth/apple/callback`
     - Production: `https://your-domain.com/api/auth/oauth/apple/callback`
8. Click **Save** → **Continue** → **Register**

### Step 3: Create Key for Client Secret

1. Go to **Keys** in the left sidebar
2. Click **+** (Add)
3. Fill in:
   - **Key Name**: e.g., "Vishnu Finance OAuth Key"
   - **Enable Sign In with Apple**: Check this
4. Click **Configure**
5. **Primary App ID**: Select your App ID from Step 1
6. Click **Save** → **Continue** → **Register**
7. **IMPORTANT**: Download the `.p8` key file immediately (you can only download once!)
8. Note the **Key ID** shown on the page → This is your `APPLE_OAUTH_KEY_ID`

### Step 4: Get Team ID

1. In the top right of Apple Developer Portal, click your account name
2. Your **Team ID** is shown (10-character string) → This is your `APPLE_OAUTH_TEAM_ID`

### Step 5: Generate Client Secret (JWT)

Apple requires a JWT (JSON Web Token) as the client secret. You need to generate this using the `.p8` key file.

**Option A: Use Node.js script** (Recommended)

Create a file `generate-apple-secret.js`:

```javascript
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const teamId = 'YOUR_TEAM_ID';
const clientId = 'com.yourcompany.vishnufinance.web'; // Your Services ID
const keyId = 'YOUR_KEY_ID';
const privateKeyPath = path.join(__dirname, 'AuthKey_XXXXXXXXXX.p8'); // Your downloaded .p8 file

const privateKey = fs.readFileSync(privateKeyPath);

const token = jwt.sign(
  {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 180, // 6 months
    aud: 'https://appleid.apple.com',
    sub: clientId,
  },
  privateKey,
  {
    algorithm: 'ES256',
    keyid: keyId,
  }
);

console.log('Apple Client Secret (JWT):');
console.log(token);
console.log('\n⚠️  This token expires in 6 months. You\'ll need to regenerate it.');
```

Run: `node generate-apple-secret.js`

**Option B: Use online tool** (Less secure, not recommended for production)

- Use a tool like [jwt.io](https://jwt.io/) with ES256 algorithm
- Or use a service that generates Apple client secrets

**Option C: Generate dynamically in code** (Best for production)

You can modify the `generateAppleClientSecret()` function in `src/lib/oauth.ts` to generate the JWT on-the-fly using the private key.

### Step 6: Add Environment Variables

Add these to your `.env.local` (development) or Vercel environment variables:

```env
APPLE_OAUTH_CLIENT_ID=com.yourcompany.vishnufinance.web  # Your Services ID
APPLE_OAUTH_CLIENT_SECRET=your-generated-jwt-token-here  # The JWT from Step 5
APPLE_OAUTH_TEAM_ID=your-team-id-here  # 10-character Team ID
APPLE_OAUTH_KEY_ID=your-key-id-here  # The Key ID from Step 3
APPLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/oauth/apple/callback  # Optional, auto-detected if not set
```

**Note**: For production, you may want to store the `.p8` private key file securely and generate the JWT dynamically rather than storing a pre-generated JWT (which expires in 6 months).

---

## Testing

After setting up the credentials:

1. Restart your development server
2. Check `/api/auth/oauth/config` - it should show which providers are configured
3. The OAuth buttons should appear on the auth page
4. Test the OAuth flow by clicking the buttons

## Troubleshooting

### Microsoft OAuth Issues

- **"Invalid client"**: Check that `MICROSOFT_OAUTH_CLIENT_ID` is correct
- **"Invalid redirect URI"**: Ensure the redirect URI in Azure matches exactly (including http/https, trailing slashes)
- **"Invalid tenant"**: Try using `"common"` for `MICROSOFT_OAUTH_TENANT_ID` if you're using personal Microsoft accounts

### Apple OAuth Issues

- **"Invalid client"**: Check that `APPLE_OAUTH_CLIENT_ID` matches your Services ID exactly
- **"Invalid redirect URI"**: Ensure the return URL in Apple Developer Portal matches exactly
- **"Invalid client secret"**: 
  - JWT might be expired (regenerate it)
  - Check that Team ID, Key ID, and Client ID in JWT match your env vars
  - Ensure the JWT is signed with ES256 algorithm
- **"Key not found"**: Verify the Key ID exists and is enabled for Sign In with Apple

## Security Notes

1. **Never commit** `.env.local` or `.p8` files to git
2. Store secrets securely in Vercel environment variables for production
3. Rotate secrets periodically
4. Apple JWT expires in 6 months - set a reminder to regenerate
5. Use different credentials for development and production

## Additional Resources

- [Microsoft Identity Platform Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Apple JWT Generation Guide](https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens)

