# Frontend Docker va CI/CD

Bu frontend `Next.js 16` bilan yozilgan va production uchun `output: "standalone"` rejimiga o'tkazildi. Shu sabab image ichida to'liq `node_modules` emas, faqat runtime uchun kerakli fayllar qoladi.

## 1. Lokal Docker build

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL=http://your-backend-host:8080 \
  --build-arg DEPLOYMENT_VERSION=local \
  -t traffic-vision-frontend:local .
```

Run:

```bash
docker run --rm -p 3000:3000 traffic-vision-frontend:local
```

## 2. Muhim cheklov

Frontend backend URL'ni `NEXT_PUBLIC_API_BASE_URL` orqali oladi va bu qiymat `next build` vaqtida browser bundle ichiga yoziladi. Demak production server uchun to'g'ri backend URL image build vaqtida berilishi shart.

Misol:

```text
https://api.example.com
```

## 3. Serverda ishga tushirish

`deploy/docker-compose.prod.yml` va `deploy/server.env.example` serverga ko'chiriladi. Keyin:

```bash
docker compose --env-file server.env -f docker-compose.prod.yml up -d
```

## 4. GitHub Actions shabloni

`deploy/github-actions-frontend.yml.example` fayli tayyor shablon. Uni repo root ichiga `.github/workflows/deploy-frontend.yml` qilib ko'chirish kerak.

Kerak bo'ladigan secrets:

- `NEXT_PUBLIC_API_BASE_URL`
- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_SSH_KEY`

## 5. Reverse proxy

Next.js self-hosting uchun oldida `nginx` yoki shunga o'xshash reverse proxy bo'lishi ma'qul. Minimal yo'nalish:

- `frontend.example.com` -> `localhost:3000`
- `api.example.com` -> Spring Boot `localhost:8080`

## 6. Keyingi bosqich

Agar xohlasangiz keyingi qadamda quyidagilardan birini qilamiz:

1. Java backend uchun Dockerfile va compose qo'shamiz.
2. Python AI servis uchun Dockerfile va compose qo'shamiz.
3. To'liq `frontend + backend + ai + postgres + nginx` production stack tayyorlaymiz.
