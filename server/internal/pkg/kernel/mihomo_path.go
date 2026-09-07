package kernel

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"poolx/internal/pkg/common"
)

var (
	// mihomoEnvKeys defines environment variables that may specify the binary path
	mihomoEnvKeys = []string{
		"MIHOMO_BINARY_PATH",
		"MIHOMO_PATH",
		"CLASH_BINARY_PATH",
		"CLASH_PATH",
	}
)

// ResolveExecutablePath takes a candidate path (file or directory, relative or absolute, with or without .exe),
// and attempts to resolve it to an existing, absolute executable file.
// Returns "" if the candidate does not point to an existing file.
func ResolveExecutablePath(rawPath string) string {
	candidate := strings.TrimSpace(rawPath)
	if candidate == "" {
		return ""
	}

	// Expand environment variables if present (e.g. %USERPROFILE% or $HOME)
	candidate = os.ExpandEnv(candidate)

	// 1. If candidate is an existing directory, probe for mihomo binary inside it
	if info, err := os.Stat(candidate); err == nil && info.IsDir() {
		if runtime.GOOS == "windows" {
			if hit := probeFile(filepath.Join(candidate, "mihomo.exe")); hit != "" {
				return hit
			}
		}
		if hit := probeFile(filepath.Join(candidate, "mihomo")); hit != "" {
			return hit
		}
		return ""
	}

	// 2. On Windows: if no extension, probe candidate + ".exe" first
	if runtime.GOOS == "windows" && filepath.Ext(candidate) == "" {
		if hit := probeFile(candidate + ".exe"); hit != "" {
			return hit
		}
	}

	// 3. Probe candidate directly
	if hit := probeFile(candidate); hit != "" {
		return hit
	}

	// 4. If candidate has no path separators (bare command name), check standard locations & PATH
	if filepath.Base(candidate) == candidate {
		// Check application executable directory
		if execPath, err := os.Executable(); err == nil {
			appDir := filepath.Dir(execPath)
			if runtime.GOOS == "windows" {
				if hit := probeFile(filepath.Join(appDir, candidate+".exe")); hit != "" {
					return hit
				}
			}
			if hit := probeFile(filepath.Join(appDir, candidate)); hit != "" {
				return hit
			}
		}

		// Check current working directory
		if runtime.GOOS == "windows" {
			if hit := probeFile(filepath.Join(".", candidate+".exe")); hit != "" {
				return hit
			}
		}
		if hit := probeFile(filepath.Join(".", candidate)); hit != "" {
			return hit
		}

		// Check system PATH
		if runtime.GOOS == "windows" {
			if lp, err := exec.LookPath(candidate + ".exe"); err == nil {
				if hit := probeFile(lp); hit != "" {
					return hit
				}
			}
		}
		if lp, err := exec.LookPath(candidate); err == nil {
			if hit := probeFile(lp); hit != "" {
				return hit
			}
		}
	}

	return ""
}

// ResolveMihomoBinaryPath resolves the Mihomo executable path following the unified priority chain:
// 1. Explicit candidate paths passed via parameters (e.g. request param)
// 2. Running setting: common.MihomoBinaryPath
// 3. Environment variables: MIHOMO_BINARY_PATH, MIHOMO_PATH, CLASH_BINARY_PATH, CLASH_PATH
// 4. Default search locations:
//    - Application executable directory (same directory as poolx.exe, or bin/ subdirectory)
//    - Current working directory (./, or bin/ subdirectory)
//    - System PATH (mihomo.exe / mihomo)
// Returns "" if no valid binary could be resolved. Crucially: NEVER falls back to bare "mihomo".
func ResolveMihomoBinaryPath(candidates ...string) string {
	// 1. Check explicit candidates
	for _, cand := range candidates {
		if hit := ResolveExecutablePath(cand); hit != "" {
			return hit
		}
	}

	// 2. Check running setting (common.MihomoBinaryPath)
	if hit := ResolveExecutablePath(common.MihomoBinaryPath); hit != "" {
		return hit
	}

	// 3. Check environment variables
	for _, envKey := range mihomoEnvKeys {
		envVal := os.Getenv(envKey)
		if hit := ResolveExecutablePath(envVal); hit != "" {
			return hit
		}
	}

	// 4. Check default search locations
	// 4.1 Application directory
	if execPath, err := os.Executable(); err == nil {
		appDir := filepath.Dir(execPath)
		for _, name := range candidateBinaryNames() {
			if hit := probeFile(filepath.Join(appDir, name)); hit != "" {
				return hit
			}
			if hit := probeFile(filepath.Join(appDir, "bin", name)); hit != "" {
				return hit
			}
		}
	}

	// 4.2 Current working directory
	for _, name := range candidateBinaryNames() {
		if hit := probeFile(filepath.Join(".", name)); hit != "" {
			return hit
		}
		if hit := probeFile(filepath.Join(".", "bin", name)); hit != "" {
			return hit
		}
	}

	// 4.3 System PATH
	for _, name := range candidateBinaryNames() {
		if lp, err := exec.LookPath(name); err == nil {
			if hit := probeFile(lp); hit != "" {
				return hit
			}
		}
	}

	// 5. If nothing resolved, return empty string (never fallback to bare command)
	return ""
}

func probeFile(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	clean := filepath.Clean(trimmed)
	info, err := os.Stat(clean)
	if err != nil || info.IsDir() {
		return ""
	}
	abs, err := filepath.Abs(clean)
	if err != nil {
		return clean
	}
	return abs
}

func candidateBinaryNames() []string {
	if runtime.GOOS == "windows" {
		return []string{"mihomo.exe", "mihomo"}
	}
	return []string{"mihomo"}
}
