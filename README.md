# Cloudflare Redondancy System by fox3000foxy

We will see here how to get a redondancy system from Cloudflare Workers, so even if your website is down, it keeps it online by having an offline static backup of it

## Getting started

First, fork this repository under the name "website-caches" by clicking on the Fork Button:<br>
<img width="544" height="84" alt="image" src="https://github.com/user-attachments/assets/7ed03ff9-574c-45b2-bcb3-bd04b299f9e5" />

Then modify `save.sh` to add your websites and execute the script.<br>
You may want to `chmod +x save.sh` and then `./save.sh`, or directly `sh save.sh`.<br>
<br>
You should see a folder named static: <br>
<img width="935" height="210" alt="image" src="https://github.com/user-attachments/assets/ca189a8a-fd32-44ee-abd4-e5054cce439f" />

Your website is now saved in the folder:<br>
<img width="932" height="230" alt="image" src="https://github.com/user-attachments/assets/51b992b0-d64f-4d50-904e-55956dd0be03" />
<br>
If you don't see you website, it means your manipulation gone wrong, retry.

## Deploying a worker
Now go to [Cloudflare](https://dash.cloudflare.com/) and create a worker:<br>
<img width="1286" height="634" alt="image" src="https://github.com/user-attachments/assets/57d97246-5c10-47cc-bfc1-5f32cc53289f" />

Click on Continue with Github and select your website-caches repo:<br>
<img width="1207" height="510" alt="image" src="https://github.com/user-attachments/assets/97dace1e-fdc8-42de-bd44-ab50664ff1dc" />

Put `npx wrangler deploy --assets=./static --compatibility-date 2026-01-01` on the Deploy command field:<br>
<img width="1194" height="748" alt="image" src="https://github.com/user-attachments/assets/e029782b-8bc9-48cd-839a-8d0d6cc26149" />

And then click Deploy.

## Creating the proxy

From now, we will create a worker to handle our requests.
Create a worker named `proxy` from Hello World code.<br>
<img width="800" height="736" alt="image" src="https://github.com/user-attachments/assets/6d9d9104-bdc2-43bc-9042-19583a6f1375" />

Then click Create.

Click on Modify code, you should arrive on some code GUI.<br>
<img width="1920" height="923" alt="image" src="https://github.com/user-attachments/assets/ab892834-4716-49e6-b0aa-c2f25600d9b5" />

Paste the content of `proxy-code.js` inside and make sure to replace `fox3000foxy` with your own username:<br>
<img width="783" height="186" alt="image" src="https://github.com/user-attachments/assets/c25c7fba-80b6-4cda-aa4c-1522a8198079" />

Then click deploy:<br>
<img width="262" height="76" alt="image" src="https://github.com/user-attachments/assets/bc770688-9ae7-405c-962c-6717ab869c16" />

Change your A and AAAA records subdomain to be "-". And add your domain as your worker domain:<br>
<img width="1335" height="590" alt="image" src="https://github.com/user-attachments/assets/138d7851-be10-45f0-94a2-5164883f8f9c" /><br>
<img width="974" height="330" alt="image" src="https://github.com/user-attachments/assets/d7617b9f-608c-4089-80e5-08d12dedc343" />

Now you have a complete rendundancy system that handle a machine crash from your side!
I suggest executing the save.sh script every 30 minutes via a crontab, but this delay is up to you.
You can also choose to save manually a backup by executing the script, but if your websites changes a lot, it will help the backup static save to be up to date.


