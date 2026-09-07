package kernel

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"poolx/internal/pkg/common"
)

func TestResolveExecutablePath_Explicit(t *testing.T) {
	tempDir := t.TempDir()
	fileName := "test-bin"
	if runtime.GOOS == "windows" {
		fileName += ".exe"
	}
	targetFile := filepath.Join(tempDir, fileName)
	if err := os.WriteFile(targetFile, []byte("echo 1"), 0o755); err != nil {
		t.Fatalf("write temp binary: %v", err)
	}

	resolved := ResolveExecutablePath(targetFile)
	if resolved == "" {
		t.Fatalf("expected resolved path, got empty")
	}
	expectedAbs, _ := filepath.Abs(targetFile)
	if resolved != expectedAbs {
		t.Fatalf("expected %s, got %s", expectedAbs, resolved)
	}
}

func TestResolveExecutablePath_WindowsAutoExe(t *testing.T) {
	tempDir := t.TempDir()
	exeFile := filepath.Join(tempDir, "sample.exe")
	if err := os.WriteFile(exeFile, []byte("echo 1"), 0o755); err != nil {
		t.Fatalf("write sample.exe: %v", err)
	}

	if runtime.GOOS == "windows" {
		// Path without .exe
		withoutExt := filepath.Join(tempDir, "sample")
		resolved := ResolveExecutablePath(withoutExt)
		expectedAbs, _ := filepath.Abs(exeFile)
		if resolved != expectedAbs {
			t.Fatalf("expected %s, got %s", expectedAbs, resolved)
		}
	}
}

func TestResolveExecutablePath_Directory(t *testing.T) {
	tempDir := t.TempDir()
	binName := "mihomo"
	if runtime.GOOS == "windows" {
		binName += ".exe"
	}
	binFile := filepath.Join(tempDir, binName)
	if err := os.WriteFile(binFile, []byte("echo 1"), 0o755); err != nil {
		t.Fatalf("write mihomo in dir: %v", err)
	}

	resolved := ResolveExecutablePath(tempDir)
	expectedAbs, _ := filepath.Abs(binFile)
	if resolved != expectedAbs {
		t.Fatalf("expected dir resolve to %s, got %s", expectedAbs, resolved)
	}
}

func TestResolveMihomoBinaryPath_PriorityChain(t *testing.T) {
	tempDir := t.TempDir()
	binName := "mihomo"
	if runtime.GOOS == "windows" {
		binName += ".exe"
	}

	// 1. Env variable resolution
	envBin := filepath.Join(tempDir, "env-"+binName)
	if err := os.WriteFile(envBin, []byte("env"), 0o755); err != nil {
		t.Fatalf("write env bin: %v", err)
	}

	t.Setenv("MIHOMO_PATH", envBin)

	// Clean common.MihomoBinaryPath for test
	originalCommon := common.MihomoBinaryPath
	common.MihomoBinaryPath = ""
	t.Cleanup(func() {
		common.MihomoBinaryPath = originalCommon
	})

	resolved := ResolveMihomoBinaryPath("")
	expectedEnvAbs, _ := filepath.Abs(envBin)
	if resolved != expectedEnvAbs {
		t.Fatalf("expected env path %s, got %s", expectedEnvAbs, resolved)
	}

	// 2. Candidate priority over env
	candidateBin := filepath.Join(tempDir, "cand-"+binName)
	if err := os.WriteFile(candidateBin, []byte("cand"), 0o755); err != nil {
		t.Fatalf("write candidate bin: %v", err)
	}

	resolvedCand := ResolveMihomoBinaryPath(candidateBin)
	expectedCandAbs, _ := filepath.Abs(candidateBin)
	if resolvedCand != expectedCandAbs {
		t.Fatalf("expected candidate path %s, got %s", expectedCandAbs, resolvedCand)
	}
}

func TestResolveMihomoBinaryPath_EmptyReturnsEmptyNotBare(t *testing.T) {
	// Clean environment and common
	t.Setenv("MIHOMO_PATH", "")
	t.Setenv("MIHOMO_BINARY_PATH", "")
	t.Setenv("CLASH_PATH", "")
	t.Setenv("CLASH_BINARY_PATH", "")

	originalCommon := common.MihomoBinaryPath
	common.MihomoBinaryPath = ""
	t.Cleanup(func() {
		common.MihomoBinaryPath = originalCommon
	})

	resolved := ResolveMihomoBinaryPath("non_existent_fake_path_12345")
	if resolved == "mihomo" {
		t.Fatalf("expected not to return bare 'mihomo'")
	}
}
