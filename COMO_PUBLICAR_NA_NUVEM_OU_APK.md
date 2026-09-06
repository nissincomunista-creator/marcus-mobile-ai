# 🌐 COMO HOSPEDAR SEU APLICATIVO NA NUVEM (100% GRÁTIS E INDEPENDENTE DO PC)

Com esta configuração, seu aplicativo fica online 24 horas por dia em um link da internet (ex: `https://marcus-leiloes.onrender.com`).
Qualquer cliente no Brasil pode abrir no celular (Android ou iPhone), logar e instalar direto na tela de início como aplicativo independente, sem você precisar deixar nenhum computador ligado!

---

### OPÇÃO 1: HOSPEDAGEM 1-CLIQUE NO RENDER (Recomendada / Grátis)
1. Crie uma conta gratuita em [render.com](https://render.com).
2. Conecte sua conta do GitHub.
3. Crie um repositório com os arquivos da pasta `marcus-mobile-ai`.
4. No Render, clique em **"New +" -> "Web Service"** e selecione o repositório.
5. Em **Build Command**, coloque: `npm install && npm run build`
6. Em **Start Command**, coloque: `node dist/server.cjs`
7. Clique em **"Deploy Web Service"**.
8. Em 2 minutos, o Render fornecerá seu link público oficial HTTPS!

---

### OPÇÃO 2: GERAR APK NATIVO ANDROID
Se preferir gerar o arquivo instalador direto `.apk` para enviar no WhatsApp dos clientes:
1. No terminal da pasta `marcus-mobile-ai`, instale o Capacitor:
   `npm install @capacitor/core @capacitor/cli @capacitor/android`
2. Inicialize o projeto Android:
   `npx cap add android`
3. Copie o build do app:
   `npm run build && npx cap copy`
4. Abra no Android Studio para gerar o `.apk`:
   `npx cap open android` (Menu *Build > Build Bundle(s) / APK(s) > Build APK(s)*).

---

### CREDENCIAIS DE ACESSO PADRÃO:
- **Acesso Master (Marcus):** `marcus2025` ou `admin`
- **Acesso Cliente VIP:** `cliente` ou `investidor`
