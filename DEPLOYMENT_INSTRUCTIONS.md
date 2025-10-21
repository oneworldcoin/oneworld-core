خطوات إعداد ونشر عقد ONEW على الشبكة الرئيسية (mainnet)

تنبيه: هذا المستودع يحتوي على سكربت نشر، لكن لا يتم تشغيل نشر فعلي بدون مفاتيحك وموافقتك.

1) الإعداد
   - انسخ ملف `.env.example` إلى `.env` واملأ المتغيرات التالية:
     - PRIVATE_KEY: مفتاح المحفظة التي ستستخدمها للنشر (استخدم محفظة بتمويل كافٍ).
     - MAINNET_RPC: عنوان RPC، مثلاً من Infura أو Alchemy.
     - ETHERSCAN_API_KEY: مفتاح Etherscan إن أردت التحقق التلقائي بعد النشر.
     - CONFIRM_DEPLOY=true (مطلوب لتأكيد النشر على الشبكة الرئيسية).

2) تثبيت الاعتماديات محليًا
   - npm install --legacy-peer-deps

3) تحقق محليًا
   - npx hardhat compile
   - npx hardhat test

4) تنفيذ نشر تجريبي (اختياري)
   - استخدم شبكة اختبار أو fork محلي لمحاكاة:
     - npx hardhat node
     - npx hardhat run scripts/deploy.js --network localhost

5) النشر إلى mainnet (يتطلب CONFIRM_DEPLOY=true وPRIVATE_KEY)
   - تأكد من أن `.env` يعِدّ المتغيرات المطلوبة.
   - شغّل:
     - CONFIRM_DEPLOY=true npx hardhat run scripts/deploy.js --network mainnet

6) بعد النشر
   - تحقق من عناوين العقود وطابع المعاملات على Etherscan.
   - نقل ملكية (ownership) إلى محفظة عُقدة أو multisig إن لزم.

ملاحظات أمان
   - لا تضع مفاتيحك في النظام العام. استخدم secrets في CI أو Gnosis Safe لنقل الملكية النهائية.
   - يفضل إجراء النشر باستخدام محفظة مخصصة ومراقبة الغاز والرسوم.
