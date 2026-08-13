declare module 'morphicons/vue' {
  import { DefineComponent } from 'vue'
  export const MorphIcon: DefineComponent<{
    icon: any
    spring?: string | object
    size?: number | string
    strokeWidth?: number | string
    color?: string
  }>
}
