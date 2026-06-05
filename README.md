WELCOME TO OUR PROJECT "ETOURISMO" THE MUSEUM MOBILE APP

TO start with this app follow this steps:
Go to your terminal and type 'npm i' and click run
and then in src go to service and create a supabase.ts and configure with your database with supabase 
the database query in presented at database.sql 

Vercel deployment
-----------------
This repository contains a web admin app in the `admin/` folder (Vite). To deploy the admin app to Vercel the project includes a root `vercel.json` that tells Vercel to build `admin/package.json` and publish the `dist` output.

Quick deploy steps (from the repo root):

1. Ensure the `admin` dependencies are installed and build locally to verify:

	npm ci --prefix admin
	npm run build --prefix admin

2. Push to Git and import the repo into Vercel (or connect your Git provider). Vercel will run the configured build and serve the `admin/dist` static output.

If you want the mobile/Expo app to be deployed separately, treat it as a different project (Expo apps are not served from Vercel static sites).
