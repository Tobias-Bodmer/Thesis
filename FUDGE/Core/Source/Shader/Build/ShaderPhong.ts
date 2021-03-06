namespace FudgeCore {
/** Code generated by CompileShaders.mjs using the information in CompileShaders.json */

export abstract class ShaderPhong extends Shader {
  public static readonly iSubclass: number = Shader.registerSubclass(ShaderPhong);

  public static define: string[] = [];

  public static getCoat(): typeof Coat { return CoatColored; }

  public static getVertexShaderSource(): string { 
    return this.insertDefines(shaderSources["Source/ShaderPhong.vert"], this.define);
  }

  public static getFragmentShaderSource(): string { 
    return this.insertDefines(shaderSources["Source/ShaderPhong.frag"], this.define);
  }

}
}