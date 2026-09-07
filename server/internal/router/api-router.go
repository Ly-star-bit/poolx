package router

import (
	"poolx/internal/handler"
	"poolx/internal/middleware"

	"github.com/gin-gonic/gin"
)

func SetApiRouter(router *gin.Engine) {
	apiRouter := router.Group("/api")
	apiRouter.Use(middleware.GlobalAPIRateLimit())
	{
		apiRouter.GET("/status", handler.GetStatus)
		apiRouter.GET("/notice", handler.GetNotice)
		apiRouter.GET("/about", handler.GetAbout)
		apiRouter.GET("/verification", middleware.CriticalRateLimit(), middleware.TurnstileCheck(), handler.SendEmailVerification)
		apiRouter.GET("/reset_password", middleware.CriticalRateLimit(), middleware.TurnstileCheck(), handler.SendPasswordResetEmail)
		apiRouter.POST("/user/reset", middleware.CriticalRateLimit(), handler.ResetPassword)
		apiRouter.GET("/oauth/github", middleware.CriticalRateLimit(), handler.GitHubOAuth)
		apiRouter.GET("/oauth/wechat", middleware.CriticalRateLimit(), handler.WeChatAuth)
		apiRouter.GET("/oauth/wechat/bind", middleware.CriticalRateLimit(), middleware.UserAuth(), handler.WeChatBind)
		apiRouter.GET("/oauth/email/bind", middleware.CriticalRateLimit(), middleware.UserAuth(), handler.EmailBind)

		userRoute := apiRouter.Group("/user")
		{
			userRoute.POST("/register", middleware.CriticalRateLimit(), middleware.TurnstileCheck(), handler.Register)
			userRoute.POST("/login", middleware.CriticalRateLimit(), handler.Login)
			userRoute.GET("/logout", handler.Logout)

			selfRoute := userRoute.Group("/")
			selfRoute.Use(middleware.UserAuth(), middleware.NoTokenAuth())
			{
				selfRoute.GET("/self", handler.GetSelf)
				selfRoute.POST("/self/update", handler.UpdateSelf)
				selfRoute.POST("/self/delete", handler.DeleteSelf)
				selfRoute.GET("/token", handler.GenerateToken)
			}

			adminRoute := userRoute.Group("/")
			adminRoute.Use(middleware.AdminAuth(), middleware.NoTokenAuth())
			{
				adminRoute.GET("/", handler.GetAllUsers)
				adminRoute.GET("/search", handler.SearchUsers)
				adminRoute.GET("/:id", handler.GetUser)
				adminRoute.POST("/", handler.CreateUser)
				adminRoute.POST("/manage", handler.ManageUser)
				adminRoute.POST("/update", handler.UpdateUser)
				adminRoute.POST("/:id/delete", handler.DeleteUser)
			}
		}
		optionRoute := apiRouter.Group("/option")
		optionRoute.Use(middleware.RootAuth(), middleware.NoTokenAuth())
		{
			optionRoute.GET("/", handler.GetOptions)
			optionRoute.POST("/update", handler.UpdateOption)
			optionRoute.POST("/geoip/preview", handler.PreviewGeoIP)
		}
		updateRoute := apiRouter.Group("/update")
		updateRoute.Use(middleware.RootAuth(), middleware.NoTokenAuth())
		{
			updateRoute.GET("/latest-release", handler.GetLatestRelease)
			updateRoute.GET("/logs/ws", handler.StreamServerUpgradeLogs)
			updateRoute.POST("/manual-upload", handler.UploadManualServerBinary)
			updateRoute.POST("/manual-upgrade", handler.ConfirmManualServerUpgrade)
			updateRoute.POST("/upgrade", handler.UpgradeServer)
		}
		kernelRoute := apiRouter.Group("/kernel")
		kernelRoute.Use(middleware.RootAuth(), middleware.NoTokenAuth())
		{
			mihomoRoute := kernelRoute.Group("/mihomo")
			{
				mihomoRoute.POST("/inspect", handler.InspectMihomoBinary)
				mihomoRoute.POST("/upload", handler.UploadMihomoBinary)
				mihomoRoute.POST("/download", handler.DownloadMihomoBinary)
			}
		}
		fileRoute := apiRouter.Group("/file")
		fileRoute.Use(middleware.AdminAuth())
		{
			fileRoute.GET("/", handler.GetAllFiles)
			fileRoute.GET("/search", handler.SearchFiles)
			fileRoute.POST("/", middleware.UploadRateLimit(), handler.UploadFile)
			fileRoute.POST("/:id/delete", handler.DeleteFile)
		}
		sourceConfigRoute := apiRouter.Group("/source-configs")
		sourceConfigRoute.Use(middleware.AdminAuth(), middleware.NoTokenAuth())
		{
			sourceConfigRoute.POST("/parse", middleware.UploadRateLimit(), handler.ParseSourceConfig)
			sourceConfigRoute.POST("/parse-url", middleware.UploadRateLimit(), handler.ParseSourceConfigURL)
			sourceConfigRoute.POST("/test", handler.TestSourceConfigNodes)
			sourceConfigRoute.POST("/import", handler.ImportSourceConfig)
		}
		proxyNodeRoute := apiRouter.Group("/proxy-nodes")
		proxyNodeRoute.Use(middleware.AdminAuth(), middleware.NoTokenAuth())
		{
			proxyNodeRoute.GET("", handler.GetProxyNodes)
			proxyNodeRoute.GET("/options", handler.GetProxyNodeOptions)
			proxyNodeRoute.POST("/delete", handler.DeleteProxyNodes)
			proxyNodeRoute.POST("/tags", handler.UpdateProxyNodeTags)
			proxyNodeRoute.POST("/test", handler.TestProxyNodes)
			proxyNodeRoute.POST("/test-all", handler.TestAllProxyNodes)
			proxyNodeRoute.POST("/:id/status", handler.UpdateProxyNodeStatus)
			proxyNodeRoute.POST("/:id/delete", handler.DeleteProxyNode)
		}
		apiRouter.GET("/capabilities", middleware.AdminAuth(), middleware.NoTokenAuth(), handler.GetKernelCapability)
		portProfileRoute := apiRouter.Group("/port-profiles")
		portProfileRoute.Use(middleware.AdminAuth(), middleware.NoTokenAuth())
		{
			portProfileRoute.GET("", handler.GetPortProfiles)
			portProfileRoute.POST("", handler.CreatePortProfile)
			portProfileRoute.POST("/preview", handler.PreviewPortProfile)
			portProfileRoute.GET("/:id", handler.GetPortProfile)
			portProfileRoute.POST("/:id", handler.UpdatePortProfile)
			portProfileRoute.GET("/:id/preview", handler.PreviewSavedPortProfile)
			portProfileRoute.POST("/:id/runtime/save", handler.SaveRuntimeConfig)
			portProfileRoute.POST("/:id/delete", handler.DeletePortProfile)
		}
		templateRoute := apiRouter.Group("/port-profile-templates")
		templateRoute.Use(middleware.AdminAuth(), middleware.NoTokenAuth())
		{
			templateRoute.GET("", handler.GetPortProfileTemplates)
			templateRoute.POST("", handler.SavePortProfileTemplate)
			templateRoute.POST("/:id/delete", handler.DeletePortProfileTemplate)
		}
		runtimeRoute := apiRouter.Group("/runtime")
		runtimeRoute.Use(middleware.AdminAuth(), middleware.NoTokenAuth())
		{
			runtimeRoute.GET("/status", handler.GetRuntimeStatus)
			runtimeRoute.GET("/logs", handler.GetRuntimeLogs)
			runtimeRoute.POST("/start", handler.StartRuntime)
			runtimeRoute.POST("/stop", handler.StopRuntime)
			runtimeRoute.POST("/reload", handler.ReloadRuntime)
		}
		zashboardRoute := apiRouter.Group("/zashboard")
		zashboardRoute.Use(middleware.AdminAuth(), middleware.NoTokenAuth())
		{
			zashboardRoute.Any("/clash/*path", handler.ProxyZashboardClash)
		}
		logRoute := apiRouter.Group("/log")
		logRoute.Use(middleware.AdminAuth(), middleware.NoTokenAuth())
		{
			logRoute.GET("/", handler.GetAppLogs)
			logRoute.POST("/", handler.PushAppLog)
		}
	}
}
