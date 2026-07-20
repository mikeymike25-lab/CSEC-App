Start-Process powershell -ArgumentList "-NoExit", "-Command", "npx expo start --dev-client"
ssh -R 80:localhost:8081 nokey@localhost.run
