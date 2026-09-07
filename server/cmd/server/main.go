package main

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"poolx/internal/app"
)

func main() {
	rootFS := os.DirFS(".")
	buildPath := "web/build"
	indexPath := "web/build/index.html"
	zashboardPath := "zashboard/dist"

	indexPage, err := fs.ReadFile(rootFS, indexPath)
	if err != nil {
		// 尝试从 exe 所在目录探测
		if exePath, exeErr := os.Executable(); exeErr == nil {
			exeDir := filepath.Dir(exePath)
			exeFS := os.DirFS(exeDir)
			if p, readErr := fs.ReadFile(exeFS, indexPath); readErr == nil {
				indexPage = p
				rootFS = exeFS
				err = nil
			}
		}
	}

	if err != nil {
		fmt.Fprintf(os.Stderr, "[PoolX 错误] 未找到前端构建产物 %s。\n"+
			"排查建议：\n"+
			"1. 开发模式请确保在 server 目录运行，且已执行前端编译（cd web && pnpm run build）；\n"+
			"2. 若要生成内置全部静态前端、无需任何外部文件的单文件独立运行版 exe，请在 server 根目录下执行：go build -trimpath -ldflags \"-s -w\" -o poolx.exe .\n", indexPath)
		os.Exit(1)
	}

	app.RunServer(rootFS, buildPath, indexPage, zashboardPath)
}
