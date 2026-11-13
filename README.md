# 食品廣告法規審核

台灣食品／健康食品廣告文案合規預審工具（靜態網頁，無後端）。

- 依據：食品安全衛生管理法 §28、§45；健康食品管理法 §2、3、6、13、14、21、24；《食品及相關產品標示宣傳廣告涉及不實誇張易生誤解或醫療效能認定準則》（113.05.08）含附件一、附件二；衛福部食藥署《食品廣告合規輔導指引》（115.05.18 第 1 版）。
- 內建開放資料：健康食品資料集（data.gov.tw/dataset/6951）、違規食品廣告資料集（data.gov.tw/dataset/6949），皆取自官方 API。
- 支援文字、PDF（PDF.js，掃描頁轉圖片 OCR）、Word .docx（mammoth.js）、圖片（Tesseract.js chi_tra+eng 或 Vision AI）。
- 紅線／黃線／藍線分級、法條依據、修改建議、安全版全文、報告匯出（PDF／Markdown／Word／HTML／CSV／JSON）。
- 機密保護：AI 金鑰與審核紀錄以 AES-256-GCM（PBKDF2-SHA256 600,000 次＋隨機 salt）加密存在使用者瀏覽器；本 repo 不含任何使用者資料。
- 自備 AI 金鑰：OpenAI、Anthropic Claude、Google Gemini、OpenAI 相容端點。

本工具為輔助篩檢，非法律意見，最終以主管機關個案認定為準。第三方元件授權見 vendor/LICENSE-*。
