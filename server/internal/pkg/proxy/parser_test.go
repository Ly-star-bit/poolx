package proxy

import (
	"encoding/base64"
	"testing"
)

func TestParseYAMLExtractsProxyNodes(t *testing.T) {
	content := []byte(`
proxies:
  - name: hk-1
    type: ss
    server: 1.1.1.1
    port: 443
    cipher: aes-128-gcm
    password: secret
  - name: bad-node
    type: vmess
    server: ""
    port: 443
`)

	result, err := ParseYAML(content)
	if err != nil {
		t.Fatalf("ParseYAML returned error: %v", err)
	}
	if len(result.Nodes) != 1 {
		t.Fatalf("expected 1 valid node, got %d", len(result.Nodes))
	}
	if len(result.Issues) != 1 {
		t.Fatalf("expected 1 parse issue, got %d", len(result.Issues))
	}

	node := result.Nodes[0]
	if node.Name != "hk-1" || node.Type != "ss" || node.Server != "1.1.1.1" || node.Port != 443 {
		t.Fatalf("unexpected parsed node: %+v", node)
	}
	if node.Fingerprint == "" {
		t.Fatal("expected node fingerprint to be generated")
	}
}

func TestParseYAMLRejectsMissingProxyList(t *testing.T) {
	_, err := ParseYAML([]byte("mixed-port: 7890"))
	if err == nil {
		t.Fatal("expected YAML without proxies to fail")
	}
}

// 验证 ParseSubscription 在 Clash YAML 输入下走 ParseYAML 分支（回归保护）。
func TestParseSubscriptionAcceptsClashYAML(t *testing.T) {
	content := []byte(`
proxies:
  - name: yaml-node
    type: ss
    server: 8.8.8.8
    port: 443
    cipher: aes-128-gcm
    password: secret
`)
	result, err := ParseSubscription(content)
	if err != nil {
		t.Fatalf("ParseSubscription returned error: %v", err)
	}
	if len(result.Nodes) != 1 || result.Nodes[0].Name != "yaml-node" {
		t.Fatalf("unexpected result: %+v", result)
	}
}

// 验证 base64 编码的 ss:// 列表能被识别并解析。
// 使用 SIP002 的标准形式：ss://base64(method:password)@host:port#name
func TestParseSubscriptionAcceptsBase64URIList(t *testing.T) {
	userinfo := base64.StdEncoding.EncodeToString([]byte("aes-128-gcm:secret"))
	uriList := "ss://" + userinfo + "@1.2.3.4:443#hk-base64\n" +
		"ss://" + userinfo + "@5.6.7.8:443#sg-base64"
	encoded := base64.StdEncoding.EncodeToString([]byte(uriList))

	result, err := ParseSubscription([]byte(encoded))
	if err != nil {
		t.Fatalf("ParseSubscription returned error: %v", err)
	}
	if len(result.Nodes) < 1 {
		t.Fatalf("expected at least one node from base64 subscription, got %+v", result)
	}
	// 节点名称由 convert 解码 #fragment 得到；只要含「base64」即可。
	for _, n := range result.Nodes {
		if n.Server == "" || n.Port == 0 || n.Type == "" {
			t.Fatalf("node has missing required fields: %+v", n)
		}
	}
}

// 验证明文 URI 列表（未 base64）也能被识别。
func TestParseSubscriptionAcceptsPlainURIList(t *testing.T) {
	userinfo := base64.StdEncoding.EncodeToString([]byte("aes-128-gcm:secret"))
	plain := "ss://" + userinfo + "@1.2.3.4:443#hk-plain\n"

	result, err := ParseSubscription([]byte(plain))
	if err != nil {
		t.Fatalf("ParseSubscription returned error: %v", err)
	}
	if len(result.Nodes) != 1 {
		t.Fatalf("expected 1 node, got %d", len(result.Nodes))
	}
}

// 验证空内容和无效内容能给出明确错误，不 panic。
func TestParseSubscriptionRejectsInvalidInputs(t *testing.T) {
	if _, err := ParseSubscription([]byte("")); err == nil {
		t.Fatal("expected empty content to fail")
	}
	if _, err := ParseSubscription([]byte("   \n\t  ")); err == nil {
		t.Fatal("expected whitespace-only content to fail")
	}
	// 一段非 YAML、非 base64、非 URI 的随机字符串
	if _, err := ParseSubscription([]byte("this is not a subscription at all")); err == nil {
		t.Fatal("expected garbage content to fail")
	}
}

// looksLikeClashYAML 仅在含顶层 `proxies:` 时返回 true。
func TestLooksLikeClashYAML(t *testing.T) {
	cases := map[string]bool{
		"proxies:\n  - {}":         true,
		"\nproxies:\n  - {}":       true,
		"mixed-port: 7890":         false,
		"  proxies: foo":           false, // 缩进的 proxies 不算顶层
		"some random base64 text":  false,
	}
	for input, want := range cases {
		if got := looksLikeClashYAML([]byte(input)); got != want {
			t.Errorf("looksLikeClashYAML(%q) = %v, want %v", input, got, want)
		}
	}
}
