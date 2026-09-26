# Deploy ResumeIQ

This setup deploys the React app and Express API together as one Render web service. Keeping them on one origin allows the httpOnly session cookie to work without third-party-cookie restrictions.

## Before deploying

1. Create a MongoDB Atlas database and database user. In Atlas Network Access, allow Render connections. Render's free web service does not provide a fixed outbound IP, so use a strong, unique database password and restrict access further if you move to a plan with static egress IPs.
2. Copy the Atlas connection string. Replace its password placeholder, URL-encode special characters in the password, and use the `resumeiq` database name.
3. Confirm your OpenAI API project has active API billing and access to the model you intend to use. API billing is separate from a ChatGPT subscription.

## Deploy from GitHub

1. Push the repository to GitHub.
2. In Render, choose **New +** then **Blueprint** and connect `ishitasingh22/ResumeIQ`.
3. Render detects `render.yaml`. Enter the Atlas connection string for `MONGODB_URI`, your API key for `LLM_API_KEY`, and an enabled chat-completions model name for `LLM_MODEL`. Do not commit these values or put them in frontend variables.
4. Create the Blueprint. Render generates `JWT_SECRET` and builds the client before starting the API.
5. Open the service URL from Render. Check `/api/health`, then test registration, login, and one analysis.

The frontend uses relative `/api` requests in production. Express serves `client/dist` and falls back to `index.html` for client-side routes. `RENDER_EXTERNAL_URL` is allowed by the server CORS configuration for credentialed requests.

## Redeploys

Subsequent pushes to the connected branch trigger Render deployments. Keep `server/.env` local only; Render environment values belong in the service's Environment settings.