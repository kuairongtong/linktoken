LINKER 是基于 [MetaMask](https://github.com/MetaMask/metamask-extension) 开发的链克浏览器插件

## 使用

1. 安装 `yarn`

        npm install -g yarn

2. 安装必要的模块

        yarn install

3. 打包

        yarn run dist

这样就可以在 `builds` 目录下看到打包好的 **链克浏览器插件**


## 开发调试


1. 安装 `yarn`

        npm install -g yarn

2. 安装必要的模块

        yarn install

3. 开启本地调试

        yarn run mascara


4. 访问页面，浏览器点击下面的链接

    [http://localhost:9001/](http://localhost:9001/)


## 发布注意事项

如果要修改版本号，需要修改以下三个地方

1. `app/manifest.json` 中的 `version`
2. `app/scripts/platforms/sw.js` 中的 `getVersion`
3. `app/scripts/platforms/window.js` 中的 `getVersion`


## 反向代理服务器设置

```conf
server {
    listen        80;
    server_name   main-linktoken.krtnt.com;
    location / {
        proxy_set_header Nc IN;
        proxy_pass  https://walletapi.onethingpcs.com;
    }
}
server {
    listen        80;
    server_name   test-linktoken.krtnt.com;
    location / {
        proxy_set_header Nc IN;
        proxy_pass  https://sandbox-walletapi.onethingpcs.com;
    }
}
server {
    listen        80;
    server_name   price-linktoken.krtnt.com;
    location /api/ticker {
         add_header Access-Control-Allow-Origin '*';
         proxy_pass https://api.66otc.com;
    }
}
```

## 请求访问权限

任何 DAPP 接入钱包，首选需要获得授权，授权请求如下


```
window.linkTokenEthereum.enable()
```


## DAPP 转账调用

客户端可以使用钱包提供的 linktoken.js 来进行操作

```
linktoken.eth.accounts
```

如果你想要使用自己的 web3.js ，那么可以使用下面的 「 提供者 」

```
window.linkTokenEthereum
```

例如

```
window.linktoken = new Web3(window.linkTokenEthereum)
```

> 注意： 为了与 MetaMask 区分，我们的全局变量名为 `linktoken` 而不是 `web3`


其它操作和火狐狸一样

前端使用

```js
linktoken.eth.sendTransaction({
    from:linktoken.eth.defaultAccount,
    to:'0x1ab9f479c84e08A8778E2E137cDFF40BAfe42d8a',
    value:linktoken.toWei(0.01),
    gasPrice:"0x174876e800",
    gas:"0x186a0",
    data:"xxx"
    },
    console.log)
```

`gas` 的值是固定的，一定要传


## DAPP 合约调用调用

DAPP 合约调用和转账调用差不多，唯一不同的是需要到服务器上去获取加密数据

相关案例请查看 `demo/index.html` ，使用代码如下

```html
if (!window.linktoken) {
    alert("linktoken 不存在");
    return;
}

if (!linktoken.eth.defaultAccount) {
  alert("你还未解锁或选择账号");
  return;
}


var to_num      = "0.1"
var title       = "开心问答"
var desc        = "合约执行-开心问答-出题"
var server_id   = "100132"
var data        = "0xe615b42d87ce9fb076e206b40a6ab86e39ba8d0097abec87a8fa990c91a1d0b9269835aec89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6"


var query = "data=" + data + '&' + 
          "desc=" + desc + '&' + 
          "title=" + title  + '&' + 
          "value=" + to_num
    query += '&rnd=' + (+ new Date())

fetch("http://api.wkc.megole.com/api/get_tx_data?" + query  ,{
    method:'GET',
    mode: 'cors',
    credentials: 'same-origin', 
})
.then(resp => resp.json())
.then(predata => {

    if ( !predata.gas_limit) {
        alert("获取数据失败");
        return
    }

    predata.gas_limit = parseInt(predata.gas_limit)

    var to_address = predata.to
    var num        = linktoken.toHex(predata.value)
    let txParams = {
        from: linktoken.eth.defaultAccount,
        to: to_address,
        value: num,
        gas:predata.gas_limit,
        gasPrice: '0x174876e800',
        data: predata.data,
        extension: predata
    };

    linktoken.eth.sendTransaction(txParams,console.log)
    
}).catch(console.err)
</script>
</html>
```

## 打赏

如果项目对你有用，请用链克打赏我，地址

0xe344a00519b2646afbcfafb16aa3b79283c729d6

![](https://linktoken.krtnt.com/file/wallet.png)