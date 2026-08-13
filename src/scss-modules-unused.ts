import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import ts from "typescript"

const typingsRequiredMessage = "Generate and validate CSS Module typings before running scss-modules-unused."

interface ScssModulesUnusedDiagnostic {
	className?: string,
	filePath: string,
	message: string,
}

export interface ScssModulesUnusedResult {
	diagnostics: ScssModulesUnusedDiagnostic[],
	errors: ScssModulesUnusedDiagnostic[],
}

interface ModuleUsage {
	classNames: Set<string>,
	filePath: string,
	usedClassNames: Set<string>,
}

interface OutputWriter {
	error(message: string): void,
	log(message: string): void,
}

function formatTsDiagnostic(diagnostic: ts.Diagnostic) {
	return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
}

function loadProject(projectPath: string) {
	const configFile = ts.readConfigFile(projectPath, filePath => ts.sys.readFile(filePath))
	if (configFile.error) {
		throw new Error(`Unable to load TypeScript project '${projectPath}': ${formatTsDiagnostic(configFile.error)}`)
	}

	const parsed = ts.parseJsonConfigFileContent(
		configFile.config,
		ts.sys,
		path.dirname(projectPath),
		undefined,
		projectPath,
	)
	if (parsed.errors.length > 0) {
		throw new Error(`Unable to load TypeScript project '${projectPath}': ${parsed.errors.map(formatTsDiagnostic).join("\n")}`)
	}

	return parsed
}

function removeDeclarationSuffix(filePath: string) {
	for (const suffix of [".d.ts", ".d.mts", ".d.cts"]) {
		if (filePath.endsWith(suffix)) {
			return filePath.slice(0, -suffix.length)
		}
	}
	return undefined
}

function findStylesheetPath(
	sourceFile: ts.SourceFile,
	moduleName: string,
	resolvedDeclarationPath: string | undefined,
	options: ts.CompilerOptions,
) {
	if (moduleName.startsWith(".")) {
		const importedPath = path.resolve(path.dirname(sourceFile.fileName), moduleName)
		if (existsSync(importedPath)) {
			return importedPath
		}
	}

	if (resolvedDeclarationPath) {
		const declarationTarget = removeDeclarationSuffix(resolvedDeclarationPath)
		if (declarationTarget) {
			if (existsSync(declarationTarget)) {
				return declarationTarget
			}

			for (const sourceRoot of options.rootDirs ?? []) {
				const relativePath = path.relative(sourceRoot, declarationTarget)
				if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
					continue
				}
				for (const targetRoot of options.rootDirs ?? []) {
					const candidate = path.resolve(targetRoot, relativePath)
					if (existsSync(candidate)) {
						return candidate
					}
				}
			}
		}
	}

	return moduleName.startsWith(".") ?
			path.resolve(path.dirname(sourceFile.fileName), moduleName) :
		moduleName
}

function getStringLiteralKeys(checker: ts.TypeChecker, type: ts.Type): Set<string> | undefined {
	if (type.isStringLiteral()) {
		return new Set([type.value])
	}
	if (type.isUnion()) {
		const keys = new Set<string>()
		for (const member of type.types) {
			const memberKeys = getStringLiteralKeys(checker, member)
			if (!memberKeys) {
				return undefined
			}
			for (const key of memberKeys) {
				keys.add(key)
			}
		}
		return keys
	}
	if ((type.flags & ts.TypeFlags.TypeParameter) !== 0) {
		const constraint = checker.getBaseConstraintOfType(type)
		return constraint && constraint !== type ?
				getStringLiteralKeys(checker, constraint) :
			undefined
	}
	if ((type.flags & ts.TypeFlags.Never) !== 0) {
		return new Set()
	}
	return undefined
}

function addElementAccessUsage(
	checker: ts.TypeChecker,
	moduleUsage: ModuleUsage,
	argument: ts.Expression | undefined,
) {
	if (!argument) {
		for (const className of moduleUsage.classNames) {
			moduleUsage.usedClassNames.add(className)
		}
		return
	}
	const keys = getStringLiteralKeys(checker, checker.getTypeAtLocation(argument))
	if (!keys) {
		for (const className of moduleUsage.classNames) {
			moduleUsage.usedClassNames.add(className)
		}
		return
	}
	for (const key of keys) {
		moduleUsage.usedClassNames.add(key)
	}
}

function addDestructuringUsage(moduleUsage: ModuleUsage, pattern: ts.ObjectBindingPattern) {
	for (const element of pattern.elements) {
		if (element.dotDotDotToken || (!element.propertyName && !ts.isIdentifier(element.name))) {
			for (const className of moduleUsage.classNames) {
				moduleUsage.usedClassNames.add(className)
			}
			continue
		}
		const propertyName = element.propertyName ?? element.name
		if (ts.isIdentifier(propertyName) || ts.isStringLiteralLike(propertyName)) {
			moduleUsage.usedClassNames.add(propertyName.text)
		}
		else {
			for (const className of moduleUsage.classNames) {
				moduleUsage.usedClassNames.add(className)
			}
		}
	}
}

function markAllUsed(moduleUsage: ModuleUsage) {
	for (const className of moduleUsage.classNames) {
		moduleUsage.usedClassNames.add(className)
	}
}

function getKeyframeNames(stylesheetPath: string) {
	if (!path.isAbsolute(stylesheetPath) || !existsSync(stylesheetPath)) {
		return new Set<string>()
	}
	const stylesheet = readFileSync(stylesheetPath, "utf8")
		.replaceAll(/\/\*[\s\S]*?\*\//g, "")
		.replaceAll(/\/\/.*$/gm, "")
	const names = new Set<string>()
	for (const match of stylesheet.matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/g)) {
		if (match[1]) {
			names.add(match[1])
		}
	}
	return names
}

function collectBindingUsage(
	checker: ts.TypeChecker,
	program: ts.Program,
	binding: ts.Identifier,
	moduleUsage: ModuleUsage,
) {
	const bindingSymbol = checker.getSymbolAtLocation(binding)
	if (!bindingSymbol) {
		markAllUsed(moduleUsage)
		return
	}

	for (const sourceFile of program.getSourceFiles()) {
		if (sourceFile.isDeclarationFile) {
			continue
		}
		const visit = (node: ts.Node): void => {
			if (ts.isIdentifier(node) && checker.getSymbolAtLocation(node) === bindingSymbol) {
				const parent = node.parent
				if (ts.isImportClause(parent) && parent.name === node) {
					return
				}
				if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
					moduleUsage.usedClassNames.add(parent.name.text)
					return
				}
				if (ts.isElementAccessExpression(parent) && parent.expression === node) {
					addElementAccessUsage(checker, moduleUsage, parent.argumentExpression)
					return
				}
				if (
					ts.isVariableDeclaration(parent) &&
					parent.initializer === node &&
					ts.isObjectBindingPattern(parent.name)
				) {
					addDestructuringUsage(moduleUsage, parent.name)
					return
				}
				markAllUsed(moduleUsage)
			}
			ts.forEachChild(node, visit)
		}
		visit(sourceFile)
	}
}

function getDefaultExportType(
	checker: ts.TypeChecker,
	moduleSpecifier: ts.StringLiteralLike,
) {
	const moduleSymbol = checker.getSymbolAtLocation(moduleSpecifier)
	if (!moduleSymbol) {
		return undefined
	}
	const defaultExport = checker.getExportsOfModule(moduleSymbol)
		.find(symbol => symbol.name === "default")
	return defaultExport ?
			checker.getTypeOfSymbolAtLocation(defaultExport, moduleSpecifier) :
		undefined
}

export function findUnusedScssModuleClasses(projectPath: string): ScssModulesUnusedResult {
	const absoluteProjectPath = path.resolve(projectPath)
	const parsed = loadProject(absoluteProjectPath)
	const program = ts.createProgram({
		rootNames: parsed.fileNames,
		options: parsed.options,
		projectReferences: parsed.projectReferences,
	})
	const checker = program.getTypeChecker()
	const modules = new Map<string, ModuleUsage>()
	const errors = new Map<string, ScssModulesUnusedDiagnostic>()
	const bindings: { binding: ts.Identifier, moduleUsage: ModuleUsage }[] = []

	for (const sourceFile of program.getSourceFiles()) {
		if (sourceFile.isDeclarationFile) {
			continue
		}
		for (const statement of sourceFile.statements) {
			if (
				!ts.isImportDeclaration(statement) ||
				!ts.isStringLiteralLike(statement.moduleSpecifier) ||
				!statement.moduleSpecifier.text.endsWith(".module.scss")
			) {
				continue
			}

			const moduleName = statement.moduleSpecifier.text
			const resolved = ts.resolveModuleName(moduleName, sourceFile.fileName, parsed.options, ts.sys)
				.resolvedModule?.resolvedFileName
			const stylesheetPath = findStylesheetPath(sourceFile, moduleName, resolved, parsed.options)
			const defaultType = getDefaultExportType(checker, statement.moduleSpecifier)
			const properties = defaultType && (defaultType.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) === 0 ?
					checker.getPropertiesOfType(defaultType) :
					[]
			if (properties.length === 0) {
				errors.set(stylesheetPath, {
					filePath: stylesheetPath,
					message: `CSS Module import '${moduleName}' has no usable generated declaration whose default export exposes class properties. ${typingsRequiredMessage}`,
				})
				continue
			}

			const keyframeNames = getKeyframeNames(stylesheetPath)
			let moduleUsage = modules.get(stylesheetPath)
			if (!moduleUsage) {
				moduleUsage = {
					classNames: new Set(properties
						.map(property => property.name)
						.filter(className => !keyframeNames.has(className))),
					filePath: stylesheetPath,
					usedClassNames: new Set(),
				}
				modules.set(stylesheetPath, moduleUsage)
			}
			else {
				for (const property of properties) {
					if (!keyframeNames.has(property.name)) {
						moduleUsage.classNames.add(property.name)
					}
				}
			}

			const binding = statement.importClause?.name
			if (binding) {
				bindings.push({ binding, moduleUsage })
			}
		}
	}

	for (const { binding, moduleUsage } of bindings) {
		collectBindingUsage(checker, program, binding, moduleUsage)
	}

	const diagnostics = [...modules.values()]
		.flatMap(moduleUsage => [...moduleUsage.classNames]
			.filter(className => !moduleUsage.usedClassNames.has(className))
			.map(className => ({
				className,
				filePath: moduleUsage.filePath,
				message: `CSS Module class '${className}' is exported but never used by this TypeScript project.`,
			})))
		.sort((left, right) => left.filePath.localeCompare(right.filePath) || left.className.localeCompare(right.className))

	return {
		diagnostics,
		errors: [...errors.values()].sort((left, right) => left.filePath.localeCompare(right.filePath)),
	}
}

function getProjectArgument(args: string[]) {
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index]
		if (argument === "--project") {
			return args[index + 1]
		}
		if (argument.startsWith("--project=")) {
			return argument.slice("--project=".length)
		}
	}
	return undefined
}

export function runScssModulesUnusedCli(
	args: string[],
	cwd = process.cwd(),
	output: OutputWriter = console,
): number {
	if (args.includes("--help") || args.includes("-h")) {
		output.log("Usage: scss-modules-unused --project <tsconfig.json>")
		return 0
	}
	const projectArgument = getProjectArgument(args)
	if (!projectArgument) {
		output.error("Missing required --project <tsconfig.json> argument.")
		return 2
	}

	try {
		const result = findUnusedScssModuleClasses(path.resolve(cwd, projectArgument))
		for (const error of result.errors) {
			output.error(`${error.filePath}: ${error.message}`)
		}
		for (const diagnostic of result.diagnostics) {
			output.error(`${diagnostic.filePath}: ${diagnostic.message}`)
		}
		return result.errors.length > 0 || result.diagnostics.length > 0 ? 1 : 0
	}
	catch (error) {
		output.error(error instanceof Error ? error.message : String(error))
		return 2
	}
}
