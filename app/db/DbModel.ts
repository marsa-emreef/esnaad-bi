export interface DbModel{
    renderer? : Array<RendererModel>
}

export interface RendererModel {
    id : string,
    name : string,
    description : string,
    rendererFunction : string
}