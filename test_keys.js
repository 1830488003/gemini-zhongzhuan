const fs = require('fs').promises;
const path = require('path');

// --- 配置 ---
const INPUT_FILE = '密钥.txt';
const OUTPUT_FILE = '有效的密钥.txt';
// 重要：请确保这里的地址是您部署在 Netlify 上的服务地址
const NETLIFY_TEST_URL = 'https://adorable-lily-951a2e.netlify.app/v1/test-key';
const CONCURRENT_LIMIT = 10; // 同时测试的并发数
// --- 配置结束 ---

/**
 * 通过您部署在 Netlify 上的服务来测试单个 Google API 密钥的有效性
 * @param {string} apiKey - 要测试的 API 密钥
 * @returns {Promise<{apiKey: string, isValid: boolean}>}
 */
async function testApiKey(apiKey) {
  process.stdout.write(`正在通过云端服务测试密钥: ...${apiKey.slice(-4)} ... `);
  try {
    const response = await fetch(NETLIFY_TEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log('✅ 有效');
        return { apiKey, isValid: true };
      } else {
        console.log(`❌ 无效 (云端返回: ${result.error || '未知错误'})`);
        return { apiKey, isValid: false };
      }
    } else {
      console.log(`❌ 请求失败 (HTTP 状态码: ${response.status})`);
      return { apiKey, isValid: false };
    }
  } catch (error) {
    console.log(`❌ 请求失败 (网络错误: ${error.message})`);
    return { apiKey, isValid: false };
  }
}

/**
 * 主函数
 */
async function main() {
  console.log(`欢迎使用 Google API 密钥有效性云端测试脚本`);
  console.log(`将通过此地址进行测试: ${NETLIFY_TEST_URL}`);
  console.log('----------------------------------------');

  let keys;
  try {
    const rawContent = await fs.readFile(path.join(__dirname, INPUT_FILE), 'utf-8');
    keys = rawContent.split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      console.log(`错误: 在 ${INPUT_FILE} 中没有找到任何密钥。`);
      return;
    }
    console.log(`从 ${INPUT_FILE} 中成功加载了 ${keys.length} 个密钥。`);
  } catch (error) {
    console.error(`错误: 无法读取密钥文件 ${INPUT_FILE}。请确保文件存在于脚本相同目录下。`);
    return;
  }

  console.log(`开始测试... (并发数: ${CONCURRENT_LIMIT})`);
  console.log('----------------------------------------');

  const validKeys = [];
  const invalidKeys = [];
  
  for (let i = 0; i < keys.length; i += CONCURRENT_LIMIT) {
    const chunk = keys.slice(i, i + CONCURRENT_LIMIT);
    const results = await Promise.all(chunk.map(testApiKey));
    
    for (const result of results) {
      if (result.isValid) {
        validKeys.push(result.apiKey);
      } else {
        invalidKeys.push(result.apiKey);
      }
    }
  }

  console.log('----------------------------------------');
  console.log('🎉 测试完成！');
  console.log(`有效密钥: ${validKeys.length} 个`);
  console.log(`无效密钥: ${invalidKeys.length} 个`);

  if (validKeys.length > 0) {
    try {
      const outputContent = validKeys.join(',');
      await fs.writeFile(path.join(__dirname, OUTPUT_FILE), outputContent, 'utf-8');
      console.log(`✅ 所有有效的密钥已保存到文件: ${OUTPUT_FILE}`);
      const totalLength = outputContent.length;
      console.log(`所有有效密钥的总字符数: ${totalLength}`);
      if (totalLength > 5000) {
          console.warn(`⚠️ 警告: 总字符数超过 5000，可能无法完全粘贴到 Netlify 环境变量中。`);
      }
    } catch (error) {
      console.error(`错误: 无法写入有效的密钥文件: ${error.message}`);
    }
  } else {
    console.log('没有找到任何有效的密钥。');
  }
}

main();
