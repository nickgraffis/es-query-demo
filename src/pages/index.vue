<template>
  <div class="flex">
    <div id="root" ref="root"></div>
    <div id="res" ref="res" class="flex-grow bg-gray-700 font-mono text-white p-4">
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// @ts-ignore
self.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (['typescript', 'javascript'].includes(label))
      return new TsWorker()

    return new EditorWorker()
  },
}
export default defineComponent({
  setup() {
    const ESQuery = (object: any): void => JSON.stringify(object, null, 2)
    const root = ref<HTMLElement>()
    const res = ref<HTMLElement>()
    let editor: monaco.editor.IStandaloneCodeEditor
    onMounted(() => {
      const libSource = `
      const ESQuery = (object: any): void => JSON.stringify(object)
      `
      const libUri = 'ts:filename/facts.d.ts'
      monaco.languages.typescript.javascriptDefaults.addExtraLib(libSource, libUri)
      // When resolving definitions and references, the editor will try to use created models.
      // Creating a model for the library allows "peek definition/references" commands to work with the library.
      monaco.editor.createModel(libSource, 'typescript', monaco.Uri.parse(libUri))
      editor = monaco.editor.create(root.value as HTMLElement, {
        language: 'typescript',
        value: `
/**
 * Try building any query with ElasticSearchQueryBuilder.
 * Things to note:
 * 1 IDE helpers for making faster query decisions.
 * 2 Typescript to help proivde information on building ElasticSearch Queries
*/

ESQuery(

)
        `,
        theme: 'vs-dark',
        fontFamily:
      'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 14,
        lineHeight: 21,
        minimap: { enabled: false },
        fixedOverflowWidgets: true,
      })
      const model = editor.getModel()
      model?.onDidChangeContent((e) => {
        document.querySelector('#res').innerHTML = eval(editor.getValue())
      })
    })
    onUnmounted(() => {
      editor.dispose()
    })
    return {
      root,
    }
  },
})
</script>

<style scoped>
#root {
  width: 50vw;
  height: 100vh;
}
</style>
