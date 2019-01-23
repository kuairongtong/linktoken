// fs.readFileSync is inlined by browserify transform "brfs"
const fs = require('fs')
const path = require('path')

module.exports = [
  {
    id: 0,
    read: false,
    date: 'Thu Feb 09 2017',
    title: 'Terms of Use',
    body: {
      en:fs.readFileSync(path.join(__dirname, '/archive', 'notice_0_en.md'), 'utf8'),
      zh_CN:fs.readFileSync(path.join(__dirname, '/archive', 'notice_0_zh_CN.md'), 'utf8'),
      zh_TW:fs.readFileSync(path.join(__dirname, '/archive', 'notice_0_zh_TW.md'), 'utf8'),
    }
  },
  {
    id: 2,
    read: false,
    date: 'Mon May 08 2017',
    title: 'Privacy Notice',
    body: {
      en:fs.readFileSync(path.join(__dirname, '/archive', 'notice_2_en.md'), 'utf8'),
      zh_CN:fs.readFileSync(path.join(__dirname, '/archive', 'notice_2_zh_CN.md'), 'utf8'),
      zh_TW:fs.readFileSync(path.join(__dirname, '/archive', 'notice_2_zh_TW.md'), 'utf8'),
    }
  },
  {
    id: 3,
    read: false,
    date: 'Wed Jun 13 2018',
    title: 'Phishing Warning',
    body: {
      en:fs.readFileSync(path.join(__dirname, '/archive', 'notice_3_en.md'), 'utf8'),
      zh_CN:fs.readFileSync(path.join(__dirname, '/archive', 'notice_3_zh_CN.md'), 'utf8'),
      zh_TW:fs.readFileSync(path.join(__dirname, '/archive', 'notice_3_zh_TW.md'), 'utf8'),
    }
  }
]
