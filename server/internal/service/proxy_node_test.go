package service

import (
	"context"
	"testing"

	"poolx/internal/model"
	"poolx/internal/pkg/common"
	kernelpkg "poolx/internal/pkg/kernel"
)

func TestExecuteNodeTestsPersistsResult(t *testing.T) {
	setupServiceTestDB(t)

	originalRunner := runNodeKernelTest
	runNodeKernelTest = func(ctx context.Context, input kernelpkg.MihomoNodeTestInput) (*kernelpkg.MihomoNodeTestResult, error) {
		return &kernelpkg.MihomoNodeTestResult{LatencyMS: 321}, nil
	}
	t.Cleanup(func() {
		runNodeKernelTest = originalRunner
	})

	originalBinaryPath := common.MihomoBinaryPath
	common.MihomoBinaryPath = createFakeMihomoBinary(t)
	t.Cleanup(func() {
		common.MihomoBinaryPath = originalBinaryPath
	})

	node := &model.ProxyNode{
		SourceConfigID:   1,
		SourceConfigName: "seed.yaml",
		Name:             "local-node",
		Type:             "ss",
		Server:           "127.0.0.1",
		Port:             1,
		Fingerprint:      "fingerprint-local-node",
		MetadataJSON:     `{"name":"local-node"}`,
		Enabled:          true,
		LastTestStatus:   model.NodeTestStatusUnknown,
	}
	if err := model.DB.Create(node).Error; err != nil {
		t.Fatalf("seed proxy node: %v", err)
	}

	results, err := ExecuteNodeTests(context.Background(), NodeTestInput{
		NodeIDs:   []int{node.ID},
		TimeoutMS: 1000,
	})
	if err != nil {
		t.Fatalf("ExecuteNodeTests returned error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected one test result, got %d", len(results))
	}
	if results[0].Status != model.NodeTestStatusSuccess {
		t.Fatalf("unexpected test status: %+v", results[0])
	}

	var refreshed model.ProxyNode
	if err := model.DB.First(&refreshed, "id = ?", node.ID).Error; err != nil {
		t.Fatalf("reload proxy node: %v", err)
	}
	if refreshed.LastTestStatus != model.NodeTestStatusSuccess {
		t.Fatalf("expected node status to be updated, got %s", refreshed.LastTestStatus)
	}
	if refreshed.LastLatencyMS == nil || *refreshed.LastLatencyMS != 321 {
		t.Fatalf("expected node latency to be updated, got %+v", refreshed.LastLatencyMS)
	}
}

func TestExecuteNodeTestsPersistsFailureResult(t *testing.T) {
	setupServiceTestDB(t)

	originalRunner := runNodeKernelTest
	runNodeKernelTest = func(ctx context.Context, input kernelpkg.MihomoNodeTestInput) (*kernelpkg.MihomoNodeTestResult, error) {
		return nil, assertiveError("boom")
	}
	t.Cleanup(func() {
		runNodeKernelTest = originalRunner
	})

	originalBinaryPath := common.MihomoBinaryPath
	common.MihomoBinaryPath = createFakeMihomoBinary(t)
	t.Cleanup(func() {
		common.MihomoBinaryPath = originalBinaryPath
	})

	node := &model.ProxyNode{
		SourceConfigID:   1,
		SourceConfigName: "seed.yaml",
		Name:             "local-node",
		Type:             "ss",
		Server:           "127.0.0.1",
		Port:             1,
		Fingerprint:      "fingerprint-local-node-failed",
		MetadataJSON:     `{"name":"local-node"}`,
		Enabled:          true,
		LastTestStatus:   model.NodeTestStatusUnknown,
	}
	if err := model.DB.Create(node).Error; err != nil {
		t.Fatalf("seed proxy node: %v", err)
	}

	results, err := ExecuteNodeTests(context.Background(), NodeTestInput{
		NodeIDs: []int{node.ID},
	})
	if err != nil {
		t.Fatalf("ExecuteNodeTests returned error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected one test result, got %d", len(results))
	}
	if results[0].Status != model.NodeTestStatusFailed {
		t.Fatalf("unexpected test status: %+v", results[0])
	}

	var refreshed model.ProxyNode
	if err := model.DB.First(&refreshed, "id = ?", node.ID).Error; err != nil {
		t.Fatalf("reload proxy node: %v", err)
	}
	if refreshed.LastTestStatus != model.NodeTestStatusFailed {
		t.Fatalf("expected node status to be updated, got %s", refreshed.LastTestStatus)
	}
	if refreshed.LastTestError == "" {
		t.Fatal("expected node test error to be updated")
	}
}

func TestExecuteNodeTestsAlwaysRunsKernelProbe(t *testing.T) {
	setupServiceTestDB(t)

	originalRunner := runNodeKernelTest
	callCount := 0
	runNodeKernelTest = func(ctx context.Context, input kernelpkg.MihomoNodeTestInput) (*kernelpkg.MihomoNodeTestResult, error) {
		callCount++
		return &kernelpkg.MihomoNodeTestResult{LatencyMS: 999}, nil
	}
	t.Cleanup(func() {
		runNodeKernelTest = originalRunner
	})

	originalBinaryPath := common.MihomoBinaryPath
	common.MihomoBinaryPath = createFakeMihomoBinary(t)
	t.Cleanup(func() {
		common.MihomoBinaryPath = originalBinaryPath
	})

	latency := 123
	node := &model.ProxyNode{
		SourceConfigID:   1,
		SourceConfigName: "seed.yaml",
		Name:             "probe-node",
		Type:             "ss",
		Server:           "127.0.0.1",
		Port:             1,
		Fingerprint:      "fingerprint-probe-node",
		MetadataJSON:     `{"name":"probe-node"}`,
		Enabled:          true,
		LastTestStatus:   model.NodeTestStatusSuccess,
		LastLatencyMS:    &latency,
	}
	if err := model.DB.Create(node).Error; err != nil {
		t.Fatalf("seed proxy node: %v", err)
	}

	results, err := ExecuteNodeTests(context.Background(), NodeTestInput{
		NodeIDs: []int{node.ID},
	})
	if err != nil {
		t.Fatalf("ExecuteNodeTests returned error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected one test result, got %d", len(results))
	}
	if results[0].Cached {
		t.Fatalf("expected fresh result, got %+v", results[0])
	}
	if callCount != 1 {
		t.Fatalf("expected kernel runner to execute once, got %d", callCount)
	}
}

func TestNormalizeProxyNodeTags(t *testing.T) {
	result := normalizeProxyNodeTags(" hk, premium, hk，low-latency ; premium ")
	if result != "hk, premium, low-latency" {
		t.Fatalf("unexpected normalized tags: %s", result)
	}
}

func seedNodeForListTest(t *testing.T, node *model.ProxyNode) {
	t.Helper()
	if err := model.DB.Create(node).Error; err != nil {
		t.Fatalf("seed proxy node: %v", err)
	}
}

// 验证关键词在节点名中间也能命中（修复「香港」搜不到的回归用例）。
func TestListProxyNodesKeywordFuzzyMatchesMiddleSubstring(t *testing.T) {
	setupServiceTestDB(t)

	seedNodeForListTest(t, &model.ProxyNode{
		SourceConfigID: 1, SourceConfigName: "seed.yaml",
		Name: "🇭🇰 香港 01", Type: "ss", Server: "1.1.1.1", Port: 443,
		Fingerprint: "fp-hk-01", MetadataJSON: "{}", Enabled: true,
	})
	seedNodeForListTest(t, &model.ProxyNode{
		SourceConfigID: 1, SourceConfigName: "seed.yaml",
		Name: "JP-tokyo", Type: "ss", Server: "2.2.2.2", Port: 443,
		Fingerprint: "fp-jp-01", MetadataJSON: "{}", Enabled: true,
	})

	got, err := ListProxyNodes(ProxyNodeListInput{Keyword: "香港", PageSize: 100})
	if err != nil {
		t.Fatalf("ListProxyNodes: %v", err)
	}
	if len(got) != 1 || got[0].Name != "🇭🇰 香港 01" {
		t.Fatalf("expected to match 香港 node, got %+v", got)
	}
}

// 验证关键词命中 tags 字段。
func TestListProxyNodesKeywordMatchesTags(t *testing.T) {
	setupServiceTestDB(t)

	seedNodeForListTest(t, &model.ProxyNode{
		SourceConfigID: 1, SourceConfigName: "seed.yaml",
		Name: "node-a", Type: "ss", Server: "1.1.1.1", Port: 443,
		Tags:        "premium, hk",
		Fingerprint: "fp-tag-a", MetadataJSON: "{}", Enabled: true,
	})
	seedNodeForListTest(t, &model.ProxyNode{
		SourceConfigID: 1, SourceConfigName: "seed.yaml",
		Name: "node-b", Type: "ss", Server: "2.2.2.2", Port: 443,
		Tags:        "free",
		Fingerprint: "fp-tag-b", MetadataJSON: "{}", Enabled: true,
	})

	got, err := ListProxyNodes(ProxyNodeListInput{Keyword: "premium", PageSize: 100})
	if err != nil {
		t.Fatalf("ListProxyNodes: %v", err)
	}
	if len(got) != 1 || got[0].Name != "node-a" {
		t.Fatalf("expected to match by tags, got %+v", got)
	}
}

// 验证 latency_asc 排序：最快的在前，未测/失败 NULL 在末尾。
func TestListProxyNodesSortByLatencyAscPutsNullLast(t *testing.T) {
	setupServiceTestDB(t)

	fast := 100
	slow := 500
	seedNodeForListTest(t, &model.ProxyNode{
		SourceConfigID: 1, SourceConfigName: "seed.yaml",
		Name: "slow", Type: "ss", Server: "1.1.1.1", Port: 1,
		Fingerprint: "fp-slow", MetadataJSON: "{}", Enabled: true,
		LastTestStatus: model.NodeTestStatusSuccess, LastLatencyMS: &slow,
	})
	seedNodeForListTest(t, &model.ProxyNode{
		SourceConfigID: 1, SourceConfigName: "seed.yaml",
		Name: "untested", Type: "ss", Server: "2.2.2.2", Port: 2,
		Fingerprint: "fp-untested", MetadataJSON: "{}", Enabled: true,
		LastTestStatus: model.NodeTestStatusUnknown, LastLatencyMS: nil,
	})
	seedNodeForListTest(t, &model.ProxyNode{
		SourceConfigID: 1, SourceConfigName: "seed.yaml",
		Name: "fast", Type: "ss", Server: "3.3.3.3", Port: 3,
		Fingerprint: "fp-fast", MetadataJSON: "{}", Enabled: true,
		LastTestStatus: model.NodeTestStatusSuccess, LastLatencyMS: &fast,
	})

	got, err := ListProxyNodes(ProxyNodeListInput{
		PageSize: 100,
		SortBy:   model.ProxyNodeSortLatencyAsc,
	})
	if err != nil {
		t.Fatalf("ListProxyNodes: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("expected 3 nodes, got %d", len(got))
	}
	if got[0].Name != "fast" || got[1].Name != "slow" || got[2].Name != "untested" {
		t.Fatalf("unexpected order: %s, %s, %s", got[0].Name, got[1].Name, got[2].Name)
	}
}

// 验证 PageSize<0 表示「全部」，不再受默认分页限制。
func TestListProxyNodesAllPagesWhenPageSizeNegative(t *testing.T) {
	setupServiceTestDB(t)

	for i := 0; i < 25; i++ {
		seedNodeForListTest(t, &model.ProxyNode{
			SourceConfigID: 1, SourceConfigName: "seed.yaml",
			Name:        "n-" + string(rune('a'+i%26)),
			Type:        "ss",
			Server:      "10.0.0.1",
			Port:        i + 1,
			Fingerprint: "fp-page-" + string(rune('a'+i)),
			MetadataJSON: "{}", Enabled: true,
		})
	}

	got, err := ListProxyNodes(ProxyNodeListInput{PageSize: -1})
	if err != nil {
		t.Fatalf("ListProxyNodes: %v", err)
	}
	if len(got) != 25 {
		t.Fatalf("expected all 25 nodes, got %d", len(got))
	}
}

type assertiveError string

func (e assertiveError) Error() string {
	return string(e)
}
