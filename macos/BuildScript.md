# x86

```shell
env OPENSSL_DIR=/usr/local/opt/openssl@3 \
    OPENSSL_LIB_DIR=/usr/local/opt/openssl@3/lib \
    OPENSSL_INCLUDE_DIR=/usr/local/opt/openssl@3/include \
    NODE_OPTIONS="--max-old-space-size=4096" \
    yarn tauri build --target x86_64-apple-darwin
```

# Basis

```shell
env NODE_OPTIONS="--max-old-space-size=4096" yarn tauri build
```
