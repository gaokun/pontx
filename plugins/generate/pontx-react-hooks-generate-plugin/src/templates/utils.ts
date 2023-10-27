import * as path from "path";
import * as fs from "fs-extra";
import * as _ from "lodash";

const builtinStructure = {
  "core.tsx":
    '/**\n * @description pont内置请求单例\n */\n\nimport useSWR, { SWRConfig, mutate } from "swr";\nimport * as React from "react";\n\nconst defaultOptions = {\n  /** 错误重试，默认关闭 */\n  shouldRetryOnError: false,\n  /** 获取焦点时，不重新请求 */\n  revalidateOnFocus: false,\n  /** 接口缓存 1 分钟 */\n  dedupingInterval: 60000,\n};\n\nexport function getAPIMethods(apiMetaData: any) {\n  const { method, path, hasBody } = apiMetaData;\n\n  const methods = {\n    mutate: (params = {}, newValue = undefined, options) => {\n      return mutate(PontCore.getUrlKey(path, params, method), newValue, options);\n    },\n    trigger: (params = {}) => {\n      return mutate(PontCore.getUrlKey(path, params, method));\n    },\n    useRequest: (params = {}, swrOptions = {}) => {\n      return PontCore.useRequest(path, params, swrOptions, apiMetaData);\n    },\n    useDeprecatedRequest: (params = {}, swrOptions = {}) => {\n      return PontCore.useRequest(path, params, swrOptions, apiMetaData);\n    },\n    request: (params = {}, options = {}) => {\n      return PontCore.fetch(PontCore.getUrl(path, params, method), {\n        method,\n        ...options,\n        ...apiMetaData,\n      });\n    },\n  };\n\n  if (hasBody) {\n    methods.request = (params, body, options = {}) => {\n      return PontCore.fetch(PontCore.getUrl(path, params, method), {\n        method,\n        body,\n        ...options,\n      });\n    };\n  }\n  return methods;\n}\n\nclass PontHooksCore {\n  static singleInstance = null as any as PontHooksCore;\n\n  static getSignleInstance() {\n    if (!PontHooksCore.singleInstance) {\n      PontHooksCore.singleInstance = new PontHooksCore();\n      return PontHooksCore.singleInstance;\n    }\n    return PontHooksCore.singleInstance;\n  }\n\n  /**\n   * fetch请求\n   * @param url 请求url\n   * @param options fetch 请求配置\n   */\n  fetch(url: string, options = {}) {\n    return fetch(url, options).then((res) => {\n      return res.json();\n    });\n  }\n\n  /**\n   * 使用外部传入的请求方法替换默认的fetch请求\n   */\n  useFetch(fetch: (url: string, options?: any) => Promise<any>) {\n    if (typeof fetch !== "function") {\n      console.error("fetch should be a function ");\n      return;\n    }\n\n    this.fetch = fetch;\n  }\n\n  getUrl(path: string, queryParams: any, method: string) {\n    const params = {\n      ...(queryParams || ({} as any)),\n    };\n\n    const url = path.replace(/\\{([^\\\\}]*(?:\\\\.[^\\\\}]*)*)\\}/gm, (match, key) => {\n      // eslint-disable-next-line no-param-reassign\n      key = key.trim();\n\n      if (params[key] !== undefined) {\n        const value = params[key];\n        delete params[key];\n        return value;\n      }\n      console.warn("Please set value for template key: ", key);\n      return "";\n    });\n\n    const paramStr = Object.keys(params)\n      .map((key) => {\n        return params[key] === undefined ? "" : `${key}=${params[key]}`;\n      })\n      .filter((id) => id)\n      .join("&");\n\n    if (paramStr) {\n      return `${url}?${paramStr}`;\n    }\n\n    return url;\n  }\n\n  getUrlKey(url: any, params = {} as any, method: string) {\n    const urlKey =\n      typeof params === "function"\n        ? () => {\n            return params ? PontCore.getUrl(url, params(), method) : null;\n          }\n        : params\n        ? PontCore.getUrl(url, params, method)\n        : null;\n\n    return urlKey;\n  }\n\n  /**\n   * 基于 swr 的取数 hooks\n   * @param url 请求地址\n   * @param params 请求参数\n   * @param options 配置信息\n   */\n  useRequest(url: any, params = {} as any, swrOptions = {} as any, fetchOptions = {} as any) {\n    const fetcher = (requestUrl: any) => PontCore.fetch(requestUrl, fetchOptions);\n    const method = fetchOptions?.method || "GET";\n\n    const urlKey = PontCore.getUrlKey(url, params, method);\n    const { data, error, isValidating, mutate } = useSWR(urlKey, fetcher, swrOptions);\n\n    return {\n      data,\n      error,\n      mutate,\n      isLoading: data === undefined || isValidating,\n    };\n  }\n\n  SWRProvider = (props) => {\n    const { ...options } = props;\n    const configValue = { ...defaultOptions, ...options } as any;\n\n    return <SWRConfig value={configValue}>{props.children}</SWRConfig>;\n  };\n\n  processAPI = (api: any, apiName: string) => {\n    if (apiName === "index") {\n      return;\n    }\n\n    const methods = getAPIMethods(api);\n\n    api.mutate = methods.mutate;\n    api.trigger = methods.trigger;\n    api.request = methods.request;\n\n    if (api.method === "GET") {\n      api.useRequest = methods.useRequest;\n    } else {\n      api.useDeprecatedRequest = methods.useRequest;\n    }\n  };\n\n  process = (specAPI = {} as any, API: any, definitions: any, hasModule = true) => {\n    const { apis, defs } = specAPI;\n\n    if (hasModule) {\n      Object.keys(apis).forEach((modName) => {\n        API[modName] = { ...apis[modName] };\n        const mod = API[modName];\n        if (modName === "index") {\n          return;\n        }\n        Object.keys(mod).forEach((apiName) => {\n          mod[apiName] = { ...mod[apiName] };\n          const api = mod[apiName];\n          this.processAPI(api, apiName);\n        });\n      });\n    } else {\n      Object.keys(apis).forEach((apiName) => {\n        API[apiName] = { ...apis[apiName] };\n        const api = apis[apiName];\n        this.processAPI(api, apiName);\n      });\n    }\n  };\n}\n\nexport const PontCore = PontHooksCore.getSignleInstance();\n',
  "process.ts":
    '"use sloppy";\nimport { PontCore } from "./core";\n\nexport const processSingleSpec = (metaData, API: any, defs: any, hasModule = true) => {\n  if (!metaData) {\n    return;\n  }\n  PontCore.process(metaData, API, defs, hasModule);\n};\n\nexport const processSpecs = (metaData: any, API: any, defs: any, hasModule = true) => {\n  if (!metaData) {\n    return;\n  }\n\n  Object.keys(metaData).forEach((specName) => {\n    const spec = metaData[specName];\n    PontCore.process(spec, API[specName], defs[specName], hasModule);\n  });\n};\n',
};

export async function getBuiltinStructure() {
  if (!_.isEmpty(builtinStructure)) {
    return builtinStructure;
  }
  // const dir = await fs.readdir(path.join(__dirname, "../../builtinSrc"));
  // const promises = dir.map(async (filename) => {
  //   const content = await fs.readFile(path.join(__dirname, "../../builtinSrc", filename), "utf8");

  //   return {
  //     content,
  //     name: filename,
  //   };
  // });
  // const files = await Promise.all(promises);
  // files.forEach((file) => {
  //   builtinStructure[file.name] = file.content;
  // });

  return builtinStructure;
}

export class GeneratorConfig {
  /** 生成全局定义 */
  useGlobalDefine = false;
}
