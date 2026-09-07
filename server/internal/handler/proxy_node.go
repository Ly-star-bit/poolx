package handler

import (
	"poolx/internal/model"
	"poolx/internal/service"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type proxyNodeStatusRequest struct {
	Enabled bool `json:"enabled"`
}

// GetProxyNodes godoc
// @Summary List proxy nodes with paging and filters
// @Tags ProxyNode
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/proxy-nodes [get]
func GetProxyNodes(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("p"))
	sourceConfigID, _ := strconv.Atoi(c.Query("source_config_id"))

	var enabled *bool
	if value := strings.TrimSpace(c.Query("enabled")); value != "" {
		parsed := value == "true" || value == "1"
		enabled = &parsed
	}

	// page_size 语义：未传走默认；显式传 0 表示「全部」，service 层转换为 -1。
	pageSize := 0
	if raw := strings.TrimSpace(c.Query("page_size")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			if parsed <= 0 {
				pageSize = -1
			} else {
				pageSize = parsed
			}
		}
	}

	nodes, err := service.ListProxyNodes(service.ProxyNodeListInput{
		Page:           page,
		PageSize:       pageSize,
		Keyword:        c.Query("keyword"),
		SourceConfigID: sourceConfigID,
		Enabled:        enabled,
		SortBy:         c.Query("sort"),
	})
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, nodes)
}

// UpdateProxyNodeStatus godoc
// @Summary Enable or disable a proxy node
// @Tags ProxyNode
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/proxy-nodes/{id}/status [post]
func UpdateProxyNodeStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		respondBadRequest(c, "无效的参数")
		return
	}

	var request proxyNodeStatusRequest
	if err := decodeJSONBody(c.Request.Body, &request); err != nil {
		respondBadRequest(c, "无效的参数")
		return
	}

	if err := service.SetProxyNodeEnabled(id, request.Enabled); err != nil {
		_ = service.AppLog.Push(model.AppLogClassificationBusiness, model.AppLogLevelWarn, "proxy node status update failed | username="+c.GetString("username")+" | node_id="+strconv.Itoa(id)+" | reason="+err.Error())
		respondFailure(c, err.Error())
		return
	}

	respondSuccessMessage(c, "")
}

// DeleteProxyNode godoc
// @Summary Delete a proxy node
// @Tags ProxyNode
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/proxy-nodes/{id}/delete [post]
func DeleteProxyNode(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		respondBadRequest(c, "无效的参数")
		return
	}

	if err := service.DeleteProxyNode(id); err != nil {
		_ = service.AppLog.Push(model.AppLogClassificationBusiness, model.AppLogLevelWarn, "proxy node delete failed | username="+c.GetString("username")+" | node_id="+strconv.Itoa(id)+" | reason="+err.Error())
		respondFailure(c, err.Error())
		return
	}

	_ = service.AppLog.Push(model.AppLogClassificationBusiness, model.AppLogLevelInfo, "proxy node deleted | username="+c.GetString("username")+" | node_id="+strconv.Itoa(id))
	respondSuccessMessage(c, "")
}

// DeleteProxyNodes godoc
// @Summary Delete selected proxy nodes
// @Tags ProxyNode
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/proxy-nodes/delete [post]
func DeleteProxyNodes(c *gin.Context) {
	var request service.ProxyNodeDeleteInput
	if err := decodeJSONBody(c.Request.Body, &request); err != nil {
		respondBadRequest(c, "无效的参数")
		return
	}

	deleted, err := service.DeleteProxyNodes(request.NodeIDs)
	if err != nil {
		_ = service.AppLog.Push(model.AppLogClassificationBusiness, model.AppLogLevelWarn, "proxy node batch delete failed | username="+c.GetString("username")+" | reason="+err.Error())
		respondFailure(c, err.Error())
		return
	}

	_ = service.AppLog.Push(model.AppLogClassificationBusiness, model.AppLogLevelInfo, "proxy nodes deleted | username="+c.GetString("username")+" | count="+strconv.Itoa(deleted))
	respondSuccess(c, gin.H{"deleted": deleted})
}

// TestProxyNodes godoc
// @Summary Test selected proxy nodes and persist the result
// @Tags ProxyNode
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/proxy-nodes/test [post]
func TestProxyNodes(c *gin.Context) {
	var request service.NodeTestInput
	if err := decodeJSONBody(c.Request.Body, &request); err != nil {
		respondBadRequest(c, "无效的参数")
		return
	}

	results, err := service.ExecuteNodeTests(c.Request.Context(), request)
	if err != nil {
		_ = service.AppLog.Push(model.AppLogClassificationBusiness, model.AppLogLevelWarn, "proxy node test failed | username="+c.GetString("username")+" | reason="+err.Error())
		respondFailure(c, err.Error())
		return
	}

	respondSuccess(c, results)
}

// TestAllProxyNodes godoc
// @Summary Test all proxy nodes matched by the given filter
// @Tags ProxyNode
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/proxy-nodes/test-all [post]
func TestAllProxyNodes(c *gin.Context) {
	var request struct {
		Keyword        string `json:"keyword"`
		SourceConfigID int    `json:"source_config_id"`
		Enabled        *bool  `json:"enabled"`
		TimeoutMS      int    `json:"timeout_ms"`
		TestURL        string `json:"test_url"`
	}
	if err := decodeJSONBody(c.Request.Body, &request); err != nil {
		respondBadRequest(c, "无效的参数")
		return
	}

	results, err := service.ExecuteNodeTestsByFilter(c.Request.Context(), service.ProxyNodeTestFilterInput{
		Keyword:        request.Keyword,
		SourceConfigID: request.SourceConfigID,
		Enabled:        request.Enabled,
		TimeoutMS:      request.TimeoutMS,
		TestURL:        request.TestURL,
	})
	if err != nil {
		_ = service.AppLog.Push(model.AppLogClassificationBusiness, model.AppLogLevelWarn, "proxy node test-all failed | username="+c.GetString("username")+" | reason="+err.Error())
		respondFailure(c, err.Error())
		return
	}

	_ = service.AppLog.Push(model.AppLogClassificationBusiness, model.AppLogLevelInfo, "proxy nodes test-all completed | username="+c.GetString("username")+" | count="+strconv.Itoa(len(results)))
	respondSuccess(c, results)
}

// UpdateProxyNodeTags godoc
// @Summary Batch update selected proxy node tags
// @Tags ProxyNode
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/proxy-nodes/tags [post]
func UpdateProxyNodeTags(c *gin.Context) {
	var request service.ProxyNodeTagsInput
	if err := decodeJSONBody(c.Request.Body, &request); err != nil {
		respondBadRequest(c, "无效的参数")
		return
	}
	updated, err := service.UpdateProxyNodeTags(request.NodeIDs, request.Tags)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, gin.H{"updated": updated})
}
