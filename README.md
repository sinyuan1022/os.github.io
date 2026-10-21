# 部署步驟
1. 安裝 Node.js,在此資料夾開終端機:  npm i -g wrangler  (或用 npx wrangler)
2. npx wrangler login
3. npx wrangler d1 create quiz-db   -> 把顯示的 database_id 貼到 wrangler.jsonc
4. npx wrangler d1 execute quiz-db --remote --file=./schema.sql
5. npx wrangler secret put ADMIN_TOKEN   -> 輸入你自己的密碼(寫入/刪除時使用)
6. npx wrangler deploy
7. 打開顯示的 *.workers.dev 網址,在頁面上方輸入密碼即可。
本機測試: npx wrangler d1 execute quiz-db --local --file=./schema.sql ; 建立 .dev.vars 內容 ADMIN_TOKEN=test ; npx wrangler dev
