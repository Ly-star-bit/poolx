package kernel

import (
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestStartMihomoProcessUsesAbsolutePaths(t *testing.T) {
	tempDir := t.TempDir()
	argsLogPath := filepath.Join(tempDir, "args.log")
	configPath := filepath.Join(tempDir, "config.yaml")
	workDir := filepath.Join(tempDir, "runtime")

	if err := os.MkdirAll(workDir, 0o755); err != nil {
		t.Fatalf("create workdir: %v", err)
	}
	if err := os.WriteFile(configPath, []byte("external-controller: 127.0.0.1:19090\n"), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	var binaryPath string
	if runtime.GOOS == "windows" {
		binaryPath = filepath.Join(tempDir, "fake-mihomo.cmd")
		script := "@echo off\r\n:loop\r\nif \"%~1\"==\"\" goto end\r\necho %~1>> \"" + argsLogPath + "\"\r\nshift\r\ngoto loop\r\n:end\r\n"
		if err := os.WriteFile(binaryPath, []byte(script), 0o755); err != nil {
			t.Fatalf("write fake mihomo: %v", err)
		}
	} else {
		binaryPath = filepath.Join(tempDir, "fake-mihomo.sh")
		script := "#!/bin/sh\nprintf '%s\\n' \"$@\" > " + shellQuote(argsLogPath) + "\n"
		if err := os.WriteFile(binaryPath, []byte(script), 0o755); err != nil {
			t.Fatalf("write fake mihomo: %v", err)
		}
	}

	cmd, err := StartMihomoProcess(binaryPath, workDir, configPath, io.Discard, io.Discard)
	if err != nil {
		t.Fatalf("start mihomo process: %v", err)
	}
	if err := cmd.Wait(); err != nil {
		t.Fatalf("wait mihomo process: %v", err)
	}

	content, err := os.ReadFile(argsLogPath)
	if err != nil {
		t.Fatalf("read args log: %v", err)
	}
	var lines []string
	for _, rawLine := range strings.Split(string(content), "\n") {
		trimmed := strings.TrimSpace(rawLine)
		if trimmed != "" {
			lines = append(lines, trimmed)
		}
	}
	if len(lines) != 4 {
		t.Fatalf("unexpected args logged: %q (parsed %d lines: %#v)", string(content), len(lines), lines)
	}

	expectedWorkDir, err := filepath.Abs(workDir)
	if err != nil {
		t.Fatalf("resolve expected workdir: %v", err)
	}
	expectedConfigPath, err := filepath.Abs(configPath)
	if err != nil {
		t.Fatalf("resolve expected config path: %v", err)
	}

	if lines[0] != "-d" || lines[1] != expectedWorkDir {
		t.Fatalf("unexpected workdir args: %v", lines[:2])
	}
	if lines[2] != "-f" || lines[3] != expectedConfigPath {
		t.Fatalf("unexpected config args: %v", lines[2:])
	}
}

func shellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "'\"'\"'") + "'"
}
