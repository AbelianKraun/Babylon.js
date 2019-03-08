import { NodeMaterialBlockConnectionPointTypes } from './nodeMaterialBlockConnectionPointTypes';
import { NodeMaterialCompilationState } from './nodeMaterialCompilationState';
import { Nullable } from '../../types';
import { NodeMaterialConnectionPoint } from './nodeMaterialBlockConnectionPoint';
import { NodeMaterialBlockTargets } from './nodeMaterialBlockTargets';

/**
 * Defines a block that can be used inside a node based material
 */
export class NodeMaterialBlock {
    private _buildId: number;
    private _target: NodeMaterialBlockTargets;
    private _isFinalMerger = false;

    /** @hidden */
    protected _inputs = new Array<NodeMaterialConnectionPoint>();
    /** @hidden */
    protected _outputs = new Array<NodeMaterialConnectionPoint>();

    /**
     * Gets or sets the name of the block
     */
    public name: string;

    /**
     * Gets a boolean indicating that this block is an end block (e.g. it is generating a system value)
     */
    public get isFinalMerger(): boolean {
        return this._isFinalMerger;
    }

    /**
     * Gets or sets the build Id
     */
    public get buildId(): number {
        return this._buildId;
    }

    public set buildId(value: number) {
        this._buildId = value;
    }

    /**
     * Gets or sets the target of the block
     */
    public get target() {
        return this._target;
    }

    public set target(value: NodeMaterialBlockTargets) {
        if ((this._target & value) !== 0) {
            return;
        }
        this._target = value;
    }

    /**
     * Gets the list of input points
     */
    public get inputs(): NodeMaterialConnectionPoint[] {
        return this._inputs;
    }

    /** Gets the list of output points */
    public get outputs(): NodeMaterialConnectionPoint[] {
        return this._outputs;
    }

    /**
     * Find an input by its name
     * @param name defines the name of the input to look for
     * @returns the input or null if not found
     */
    public getInputByName(name: string) {
        let filter = this._inputs.filter((e) => e.name === name);

        if (filter.length) {
            return filter[0];
        }

        return null;
    }

    /**
     * Find an output by its name
     * @param name defines the name of the outputto look for
     * @returns the output or null if not found
     */
    public getOutputByName(name: string) {
        let filter = this._outputs.filter((e) => e.name === name);

        if (filter.length) {
            return filter[0];
        }

        return null;
    }

    /**
     * Creates a new NodeMaterialBlock
     * @param name defines the block name
     * @param target defines the target of that block (Vertex by default)
     * @param isFinalMerger defines a boolean indicating that this block is an end block (e.g. it is generating a system value). Default is false
     */
    public constructor(name: string, target = NodeMaterialBlockTargets.Vertex, isFinalMerger = false) {
        this.name = name;

        this._target = target;

        if (isFinalMerger) {
            this._isFinalMerger = true;
        }
    }

    protected _declareOutput(output: NodeMaterialConnectionPoint, state: NodeMaterialCompilationState): string {
        if (output.isVarying) {
            return `${output.associatedVariableName}`;
        }

        return `${state._getGLType(output.type)} ${output.associatedVariableName}`;
    }

    protected _writeFloat(value: number) {
        let stringVersion = value.toString();

        if (stringVersion.indexOf(".") === -1) {
            stringVersion += ".0";
        }
        return `${stringVersion}`;
    }

    /**
     * Gets the current class name e.g. "NodeMaterialBlock"
     * @returns the class name
     */
    public getClassName() {
        return "NodeMaterialBlock";
    }

    /**
     * Register a new input. Must be called inside a block constructor
     * @param name defines the connection point name
     * @param type defines the connection point type
     * @param isOptional defines a boolean indicating that this input can be omitted
     * @param target defines the target to use to limit the connection point (will be VetexAndFragment by default)
     * @returns the current block
     */
    public registerInput(name: string, type: NodeMaterialBlockConnectionPointTypes, isOptional: boolean = false, target?: NodeMaterialBlockTargets) {
        let point = new NodeMaterialConnectionPoint(name, this);
        point.type = type;
        point.isOptional = isOptional;
        if (target) {
            point.target = target;
        }

        this._inputs.push(point);

        return this;
    }

    /**
     * Register a new output. Must be called inside a block constructor
     * @param name defines the connection point name
     * @param type defines the connection point type
     * @param target defines the target to use to limit the connection point (will be VetexAndFragment by default)
     * @returns the current block
     */
    public registerOutput(name: string, type: NodeMaterialBlockConnectionPointTypes, target?: NodeMaterialBlockTargets) {
        let point = new NodeMaterialConnectionPoint(name, this);
        point.type = type;
        if (target) {
            point.target = target;
        }

        this._outputs.push(point);

        return this;
    }

    /**
     * Will return the first available input e.g. the first one which is not an uniform or an attribute
     * @param forOutput defines an optional connection point to check compatibility with
     * @returns the first available input or null
     */
    public getFirstAvailableInput(forOutput: Nullable<NodeMaterialConnectionPoint> = null) {
        for (var input of this._inputs) {
            if (!input.isUniform && !input.isAttribute && !input.connectedPoint) {
                if (!forOutput || (forOutput.type & input.type) !== 0) {
                    return input;
                }
            }
        }

        return null;
    }

    /**
     * Will return the first available output e.g. the first one which is not yet connected and not a varying
     * @param forBlock defines an optional block to check compatibility with
     * @returns the first available input or null
     */
    public getFirstAvailableOutput(forBlock: Nullable<NodeMaterialBlock> = null) {
        for (var output of this._outputs) {
            if (!forBlock || !forBlock.target || (forBlock.target & output.target) !== 0) {
                return output;
            }
        }

        return null;
    }

    /**
     * Connect current block with another block
     * @param other defines the block to connect with
     * @param inputName define the name of the other block input (will take the first available one if not defined)
     * @param outputName define the name of current block output (will take the first one if not defined)
     * @returns the current block
     */
    public connectTo(other: NodeMaterialBlock, inputName?: string, outputName?: string) {
        if (this._outputs.length === 0) {
            return;
        }

        let output = outputName ? this.getOutputByName(outputName) : this.getFirstAvailableOutput(other);
        let input = inputName ? other.getInputByName(inputName) : other.getFirstAvailableInput(output);

        if (output && input) {
            output.connectTo(input);
        } else {
            throw "Unable to find a compatible match";
        }

        return this;
    }

    protected _buildBlock(state: NodeMaterialCompilationState) {
        // Empty. Must be defined by child nodes
    }

    /** @hidden */
    public get _canAddAtVertexRoot(): boolean {
        return true; // Must be overriden by children
    }

    /** @hidden */
    public get _canAddAtFragmentRoot(): boolean {
        return true; // Must be overriden by children
    }

    /**
     * Compile the current node and generate the shader code
     * @param state defines the current compilation state (uniforms, samplers, current string)
     * @returns the current block
     */
    public build(state: NodeMaterialCompilationState) {
        if (this._buildId === state.sharedData.buildId) {
            return;
        }

        // Check if "parent" blocks are compiled
        for (var input of this._inputs) {
            if (!input.connectedPoint) {
                if (!input.isOptional && !input.isAttribute && !input.isUniform) { // Emit a warning
                    state.sharedData.checks.notConnectedNonOptionalInputs.push(input);
                }
                continue;
            }

            if ((input.target & this.target!) === 0) {
                continue;
            }

            let block = input.connectedPoint.ownerBlock;
            if (block && block.target === this.target && block.buildId !== state.sharedData.buildId) {
                block.build(state);
            }
        }

        if (this._buildId === state.sharedData.buildId) {
            return; // Need to check again as inputs can be connected multiple time to this endpoint
        }

        // Logs
        if (state.sharedData.verbose) {
            console.log(`${state.target === NodeMaterialBlockTargets.Vertex ? "Vertex shader" : "Fragment shader"}: Building ${this.name} [${this.getClassName()}]`);
        }

        // Build
        for (var input of this._inputs) {
            if ((input.target & this.target!) === 0) {
                continue;
            }
            state._emitUniformOrAttributes(input);
        }

        // Checks final outputs
        if (this.isFinalMerger) {
            switch (state.target) {
                case NodeMaterialBlockTargets.Vertex:
                    state.sharedData.checks.emitVertex = true;
                    break;
                case NodeMaterialBlockTargets.Fragment:
                    state.sharedData.checks.emitFragment = true;
                    break;
            }
        }

        /** Prepare outputs */
        for (var output of this._outputs) {
            if ((output.target & this.target!) === 0 || output.associatedVariableName) {
                continue;
            }
            output.associatedVariableName = state._getFreeVariableName(output.name);
            state._emitVaryings(output);
        }

        if (state.sharedData.emitComments) {
            state.compilationString += `\r\n//${this.name}\r\n`;
        }

        this._buildBlock(state);

        this._buildId = state.sharedData.buildId;

        // Compile connected blocks
        for (var output of this._outputs) {
            if ((output.target & state.target) === 0) {
                continue;
            }

            for (var block of output.connectedBlocks) {
                if (block && (block.target & state.target) !== 0) {
                    block.build(state);
                }
            }
        }
        return this;
    }
}