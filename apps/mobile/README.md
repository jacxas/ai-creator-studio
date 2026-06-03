# Mobile

## Desarrollo
```bash
npm install
cp .env.example .env
npx expo start
```

## APK
```bash
npm install -g eas-cli
cd apps/mobile
eas login
eas build:configure
eas build -p android --profile preview
```
