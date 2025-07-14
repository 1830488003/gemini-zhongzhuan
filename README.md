# Gemini Balance Lite
# Gemini API 代理和负载均衡无服务器轻量版

### 作者：技术爬爬虾
[B站](https://space.bilibili.com/316183842)，[Youtube](https://www.youtube.com/@Tech_Shrimp)，抖音，公众号 全网同名。转载请注明作者。


## 项目简介

Gemini API 代理, 可以把Gemini API免费中转到国内。还可以聚合多个Gemini API Key，随机选取API Key的使用实现负载均衡，使得Gemini API免费成倍增加。

## Netlify部署(推荐)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/tech-shrimp/gemini-balance-lite)
<br>点击部署按钮，登录Github账户即可
<br>免费分配域名，国内可直连。

<details>
<summary>将分配的域名复制下来，如图：</summary>

![image](/docs/images/1.png)
</details>

去[AIStudio](https://aistudio.google.com)申请一个免费Gemini API Key
<br>将API Key与分配的域名填入AI客户端即可使用，如果有多个API Key用逗号分隔

<details>
<summary>以Cherry Studio为例：</summary>

![image](/docs/images/2.png)
</details>



## Deno部署

1. [fork](https://github.com/tech-shrimp/gemini-balance-lite/fork)本项目
2. 登录/注册 https://dash.deno.com/
3. 创建项目 https://dash.deno.com/new_project
4. 选择此项目，填写项目名字（请仔细填写项目名字，关系到自动分配的域名）
5. Entrypoint 填写 `src/deno_index.ts` 其他字段留空 
   <details>
   <summary>如图</summary>
   
   ![image](/docs/images/3.png)
   </details>
6. 点击 <b>Deploy Project</b>
7. 部署成功后获得域名
8. 国内使用需要配置自定义域名
9. 去[AIStudio](https://aistudio.google.com)申请一个免费Gemini API Key
10. 将API Key与分配的域名填入AI客户端即可使用，如果有多个API Key用逗号分隔

<details>
<summary>以Cherry Studio为例：</summary>

![image](/docs/images/2.png)
</details>


## Cloudflare Worker 部署
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/tech-shrimp/gemini-balance-lite)

0. CF Worker有可能会分配香港的CDN节点导致无法使用
0. 广东地区不建议使用Cloudflare Worker 部署
1. 点击部署按钮
2. 登录Cloudflare账号
3. 链接Github账户，部署
4. 打开dash.cloudflare.com，查看部署后的worker
6. 国内使用需要配置自定义域名
<details>
<summary>配置自定义域名：</summary>

![image](/docs/images/4.png)
</details>



## 打赏
#### 帮忙点点关注点点赞，谢谢啦~
B站：[https://space.bilibili.com/316183842](https://space.bilibili.com/316183842)<br>
Youtube: [https://www.youtube.com/@Tech_Shrimp](https://www.youtube.com/@Tech_Shrimp)


## 本地调试（Netlify）

1. 安装NodeJs
2. npm install -g netlify-cli
3. cd 项目根目录
4. netlify login
5. netlify dev
