package model

import "time"

const (
	NodeTestStatusUnknown = "unknown"
	NodeTestStatusSuccess = "success"
	NodeTestStatusFailed  = "failed"
)

type ProxyNode struct {
	ID               int        `json:"id" gorm:"primaryKey;autoIncrement"`
	SourceConfigID   int        `json:"source_config_id" gorm:"index;not null"`
	SourceConfigName string     `json:"source_config_name" gorm:"size:255;index;not null"`
	Name             string     `json:"name" gorm:"size:255;index;not null"`
	Type             string     `json:"type" gorm:"size:64;index;not null"`
	Server           string     `json:"server" gorm:"size:255;index;not null"`
	Port             int        `json:"port" gorm:"index;not null"`
	Tags             string     `json:"tags" gorm:"size:255;index;not null;default:''"`
	Fingerprint      string     `json:"-" gorm:"size:64;uniqueIndex;not null"`
	MetadataJSON     string     `json:"metadata_json" gorm:"type:text;not null"`
	Enabled          bool       `json:"enabled" gorm:"index;not null;default:true"`
	LastTestStatus   string     `json:"last_test_status" gorm:"size:32;index;not null;default:unknown"`
	LastLatencyMS    *int       `json:"last_latency_ms,omitempty"`
	LastTestError    string     `json:"last_test_error,omitempty" gorm:"type:text"`
	LastTestedAt     *time.Time `json:"last_tested_at,omitempty" gorm:"index"`
	CreatedAt        time.Time  `json:"created_at" gorm:"index"`
	UpdatedAt        time.Time  `json:"updated_at" gorm:"index"`
}

// 排序常量；与 service/handler 的 sort 参数对齐
const (
	ProxyNodeSortIDDesc     = "id_desc"
	ProxyNodeSortLatencyAsc = "latency_asc"
)

type ProxyNodeListFilter struct {
	Keyword        string
	SourceConfigID int
	Enabled        *bool
	SortBy         string
}

// ListProxyNodes 列出代理节点。
// limit < 0 表示不分页（用于全量测速等场景）；
// limit == 0 时使用默认值 10，保持兼容现有调用方。
func ListProxyNodes(offset int, limit int, filter ProxyNodeListFilter) ([]*ProxyNode, error) {
	query := DB
	if limit == 0 {
		limit = 10
	}
	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	switch filter.SortBy {
	case ProxyNodeSortLatencyAsc:
		// 已测且最快的在前；NULL（未测/失败）排末尾；同延迟下保持 id 倒序稳定。
		query = query.
			Order("(last_latency_ms IS NULL) ASC").
			Order("last_latency_ms ASC").
			Order("id DESC")
	default:
		query = query.Order("id DESC")
	}

	if filter.Keyword != "" {
		keyword := "%" + filter.Keyword + "%"
		query = query.Where(
			"name LIKE ? OR server LIKE ? OR type LIKE ? OR tags LIKE ?",
			keyword,
			keyword,
			keyword,
			keyword,
		)
	}
	if filter.SourceConfigID > 0 {
		query = query.Where("source_config_id = ?", filter.SourceConfigID)
	}
	if filter.Enabled != nil {
		query = query.Where("enabled = ?", *filter.Enabled)
	}

	var nodes []*ProxyNode
	if err := query.Find(&nodes).Error; err != nil {
		return nil, err
	}
	return nodes, nil
}

func GetProxyNodeByID(id int) (*ProxyNode, error) {
	item := &ProxyNode{}
	if err := DB.First(item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return item, nil
}

func DeleteProxyNodeByID(id int) error {
	return DB.Delete(&ProxyNode{}, "id = ?", id).Error
}

func FindProxyNodesByIDs(ids []int) ([]*ProxyNode, error) {
	if len(ids) == 0 {
		return []*ProxyNode{}, nil
	}
	var items []*ProxyNode
	if err := DB.Where("id IN ?", ids).Order("id asc").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func FindExistingNodeFingerprints(fingerprints []string) (map[string]struct{}, error) {
	result := make(map[string]struct{})
	if len(fingerprints) == 0 {
		return result, nil
	}

	var rows []string
	if err := DB.Model(&ProxyNode{}).
		Where("fingerprint IN ?", fingerprints).
		Pluck("fingerprint", &rows).
		Error; err != nil {
		return nil, err
	}
	for _, item := range rows {
		result[item] = struct{}{}
	}
	return result, nil
}
