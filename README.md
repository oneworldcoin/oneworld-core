# 🌐 OneWorld Token (OneW)

### Empowering Humanity Through Technology & Compassion

**OneWorld (OneW)** is a next-generation blockchain ecosystem built by the **One World Organization**, operating in over **157 countries**, with a shared vision to create a fairer, more connected, and sustainable world through decentralized innovation.

---

## 💡 Vision

To unite humanity through technology and ethics — merging blockchain innovation with global humanitarian impact.  
OneWorld bridges profit-driven progress with non-profit compassion.

---

## 🌍 Mission

To establish a blockchain network that empowers every human being with access to:

- Free and open internet (OneWorld Net – satellite-based)
- Decentralized cloud storage (Insan Cloud Web3)
- Blockchain-based real estate (NFT-linked deeds & smart contracts)
- Educational equality (Free learning platforms and moral education)
- Cultural and religious harmony (Religious Harmony Project)

---

## 🪙 Tokenomics

| Allocation | Amount | Purpose |
|-------------|---------|----------|
| Circulating Supply | 21,000,000 OneW | Public & development |
| Rewards Vault | 21,000,000 OneW | Global distribution, charity, and incentives |
| **Total Supply Cap** | **42,000,000 OneW** | Fixed maximum supply |

- **Blockchain:** Binance Smart Chain (BNB Chain – Mainnet)  
- **Decimals:** 18  
- **Symbol:** `ONEW`  
- **Contract Name:** `OneW`  
- **Vault Contract:** `RewardsVault`  
- **Minting:** 50% to deployer, 50% to RewardsVault at deployment  

---

## ⚙️ Technical Overview

- Smart contracts built using **Solidity & Hardhat**
- Ready for **future migration** to OneWorld private chain
- Compatible with **MetaMask** & **BNB Smart Chain**
- Modular design for scalability (DeFi, staking, and cross-chain bridge ready)

---

## 🌱 Humanitarian & For-profit Projects

| Project | Type | Description |
|----------|------|-------------|
| Religious Harmony | Non-profit | Promoting coexistence between religions |
| Insan / Human | Non-profit | Free access to education, ethics, and culture |
| Cloud Web3 | Tech Infrastructure | Decentralized storage for everyone |
| OneWorld Net | For-profit | Global satellite internet with free access for schools |
| RealEstate Live | For-profit | Real estate NFT contracts linked to local laws |

---

## 🔒 Security & Transparency

All contracts are open-source and should be verified on **BscScan** after deployment.  
Future governance decisions will transition to a **DAO** to ensure community-led development.

---

## 🚀 Deployment

Deployment script: `scripts/deploy.js`

Deployment command:

```bash
npx hardhat run scripts/deploy.js --network bsc
```

---

## 🛡️ دليل عملي بالأُسلوب العربي (للمنظمة)

هذا القسم يوضّح خطوات عملية ومحددة لإدارة المفاتيح، شحن المحفظة، ودمج المشروع مع منصات NFT ومحافظ الفرق.

1) إدارة المفاتيح والحوكمة

- لا تحفظ مفتاحك الخاصّ داخل الكود أو في أي Repository.
- استخدم ملف `.env` محليًا فقط وانتبه لحذف أي مفتاح بعد الاستخدام.
- قبل النشر: أنقل صلاحيات الـ `owner` وعمليات الـ `mint` إلى multisig (مثل Gnosis Safe) أو عقد حوكمة. هذا يمنع تحرّك مفاجئ للأموال من محفظة مفردة.

2) إنشاء محفظة نشر آمنة

- خطوة 1: أنشئ محفظة نشر جديدة (يفضّل hardware wallet أو wallet مخصّص للنشر).
- خطوة 2: اطلب من فريق التمويل شحن العنوان بالـ BNB الضرورية فقط (لا تشحن مبالغ كبيرة على العنوان قبل نقل الملكية إلى multisig).
- خطوة 3: تحقق من الرصيد محليًا باستخدام `deploy-ready.sh` قبل البدء.

3) دمج مع منصة NFT ومحفظة الفريق

- إن كانت لديكم منصة NFT: جهزوا metadata URIs متوافقة وواجهات API لتسجيل mint events.
- لتوقيع المعاملات دون كشف المفتاح: استعملوا Gnosis Safe أو خدمة توقيع مركزية مع HSM/Vault.
- يمكن تكوين backend service يوقّع المعاملات باستخدام service account لكن يُفضل أن يعمل عبر multisig approvals.

4) فحص ما بعد النشر

- بعد النشر على mainnet: تحقق من عناوين العقود، انشرها على BscScan، وحرّر تقرير نشر داخلي يتضمن tx hashes والأرصدة المبدئية.
- قم بنقل أي صلاحيات حساسة إلى multisig فوراً.

---

## 🔧 تشغيل الاختبارات والنشر محليًا (مقترح عملي)

1) إعداد محلي (محلياً فقط!):

```bash
# انسخ .env.example إلى .env محلياً واملأ PRIVATE_KEY هناك (لا ترفعه)
cp .env.example .env

# تثبيت الحزم
npm ci --legacy-peer-deps

# تشغيل شبكة محلية (Ganache أو Hardhat)
npx ganache --mnemonic "test test test test test test test test test test test junk" -p 8545
# أو
npx hardhat node

# نشر تجريبي إلى الشبكة المحلية
node scripts/deploy-local.js
```

2) نشر إلى testnet/mainnet

- بعد اختبار محلي ناجح، جهّز `.env` مع `PRIVATE_KEY` لمجموعة نشر منفصلة و`BSC_RPC` الخاص بالـ testnet أو mainnet.
- استخدم `deploy-ready.sh` لفحص الرصيد ثم شغّل:

```bash
npx hardhat run scripts/deploy.js --network bsc
```

---

إذا تريد، أقدر أساعدك مباشرة في:

- إعداد Gnosis Safe ومسك ownership إلى multisig بعد النشر.
- كتابة سكربت نشر يستخدم توقيع عبر Gnosis Safe.
- ربط منصة الـNFT بواجهة backend آمنة لتوقيع mint transactions.
 
### إنشاء اقتراح Gnosis Safe لنقل الملكية (آمن)

استخدم السكربت التالي لتهيئة ملف JSON جاهز لاقتراح نقل ملكية العقود إلى الـ multisig (لن يوقّع أو يرسل المعاملات، فقط يحضّر البيانات):

```bash
# ضع قيم MULTISIG_ADDRESS و ONEW_ADDRESS و REWARDS_VAULT_ADDRESS في .env محلياً
node scripts/prepare-safe-proposal.js

# سيُنشىء: deployments/safe-proposal.json
```

يمكنك بعدها رفع `deployments/safe-proposal.json` إلى واجهة Gnosis Safe أو استخدام Safe Transaction Service API لاقتراح وتنفيذ هذه المعاملات بعد توقيعها من قبل مالكي الـ multisig.


أخبرني أي خدمة تحب أبدأ بها وسأعملها خطوة بخطوة مع الأوامر والملفات اللازمة.

---

Made with ❤️ by the One World Organization
# 🌐 OneWorld Token (OneW)

### Empowering Humanity Through Technology & Compassion

**OneWorld (OneW)** is a next-generation blockchain ecosystem built by the **One World Organization**, operating in over **157 countries**, with a shared vision to create a fairer, more connected, and sustainable world through decentralized innovation.

---

## 💡 Vision

To unite humanity through technology and ethics — merging blockchain innovation with global humanitarian impact.  
OneWorld bridges profit-driven progress with non-profit compassion.

---

## 🌍 Mission

To establish a blockchain network that empowers every human being with access to:

- Free and open internet (OneWorld Net – satellite-based)
- Decentralized cloud storage (Insan Cloud Web3)
- Blockchain-based real estate (NFT-linked deeds & smart contracts)
- Educational equality (Free learning platforms and moral education)
- Cultural and religious harmony (Religious Harmony Project)

---

## 🪙 Tokenomics

| Allocation | Amount | Purpose |
|-------------|---------|----------|
| Circulating Supply | 21,000,000 OneW | Public & development |
| Rewards Vault | 21,000,000 OneW | Global distribution, charity, and incentives |
| **Total Supply Cap** | **42,000,000 OneW** | Fixed maximum supply |

- **Blockchain:** Binance Smart Chain (BNB Chain – Mainnet)  
- **Decimals:** 18  
- **Symbol:** `ONEW`  
- **Contract Name:** `OneW`  
- **Vault Contract:** `RewardsVault`  
- **Minting:** 50% to deployer, 50% to RewardsVault at deployment  

---

## ⚙️ Technical Overview

- Smart contracts built using **Solidity & Hardhat**
- Ready for **future migration** to OneWorld private chain
- Compatible with **MetaMask** & **BNB Smart Chain**
- Modular design for scalability (DeFi, staking, and cross-chain bridge ready)

---

## 🌱 Humanitarian Projects

| Project | Type | Description |
|----------|------|-------------|
| Religious Harmony | Non-profit | Promoting coexistence between religions |
| Insan / Human | Non-profit | Free access to education, ethics, and culture |
| Cloud Web3 | Tech Infrastructure | Decentralized storage for everyone |
| OneWorld Net | For-profit | Global satellite internet with free access for schools |
| RealEstate Live | For-profit | Real estate NFT contracts linked to local laws |

---

## 🔒 Security & Transparency

All contracts are open-source and verified on **BscScan**.  
Future governance decisions will transition to a **DAO** to ensure community-led development.

---

## 🚀 Deployment

Deployment script: `scripts/deploy.js`

Deployment command:

```bash
npx hardhat run scripts/deploy.js --network bsc
```
 
 ### Preparing to deploy (safety checklist)

 - Do NOT commit your real `PRIVATE_KEY` to the repository. Use the `.env.example` as a template and copy it to `.env` locally only.
 - Create a fresh wallet (MetaMask or hardware wallet) and store the mnemonic safely offline. Fund it with enough BNB to cover deployment gas.
 - Populate `.env` locally with your private key and RPC endpoint:

 ```text
 PRIVATE_KEY=your_private_key_here
 BSC_RPC=https://bsc-dataseed.binance.org/
 ```

 - Test deployment on a testnet or local hardhat node before publishing to mainnet.
 - After successful deployment, remove any private keys from local files and do not push them to remote.

 If you want, the project maintainer can help prepare the repository so the only step you need is to paste your private key into `.env` locally and run the deploy command.

 🤝 Join the Mission

 We believe in One Humanity • One Earth • One Chain

 Follow us as we build bridges between innovation and compassion.

 > For partnerships and collaborations, contact: contact@oneworld.foundation


---

 Made with ❤️ by the One World Organization
