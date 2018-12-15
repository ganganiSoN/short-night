import { ExtensionManager } from '@/extensions/index';
import Component from '@engine/common/Component';
import { DEBUG, SN } from '@engine/common/config';
import moveto = require('moveto');

export enum Breakpoint{
    PushScalesAndMilestones = 'PushScalesAndMilestones',
    FixEventBody2AxisMilestone = 'FixEventBody2AxisMilestone',
    FixEventAxis2EventAxis = 'FixEventAxis2EventAxis',
    FixEventBody2EventBodyMover = 'FixEventBody2EventBodyMover',
    FixEventBody2EventBodyFloater = 'FixEventBody2EventBodyFloater',
    Debug = 'Debug',
}

export interface BreakpointAnimationConfig {
    breakpoints?: Breakpoint[];
    playAnimation?: boolean;
}

export default class BreakpointAnimation {
    breakpoints:Breakpoint[];
    playAnimation: boolean;

    constructor(
        public etx:ExtensionManager,
        { breakpoints= [], playAnimation= false }:BreakpointAnimationConfig = {},
    ) {
        this.breakpoints = breakpoints;
        this.playAnimation = playAnimation;
        if (this.playAnimation && this.breakpoints.length === 0) {
            this.breakpoints = BreakpointAnimation.defaultAnimationBreakpoints;
        }
        if (DEBUG) {
            this.breakpoints.push(Breakpoint.Debug);
            (<any>window).next = this.next.bind(this);
        }
    }

    private stepIn :
        ((value ?:any | PromiseLike<any>) => void)
        | null
    = null;
    /**
     * Step into next breakpoint.
     * You can call window.next() to do same thing when DEBUG is true.
     * */
    next() {
        if (this.stepIn) {
            this.stepIn();
            this.stepIn = null;
        } else console.error('cannot next');
    }

    /**
     * Blocking at a breakpoint util next called
     * */
    async block(
        name :Breakpoint,
        { onBlock, onNext, components= [] }:{
            components?: Component[],
            onBlock?: () => void,
            onNext?: () => void,
        } = {},
    ) {
        if (this.breakpoints.includes(name)) {
            console.log(`blocking at ${name}`);
            if (this.playAnimation) {
                const topElement = components.find(
                    comp1 => components.every(
                        comp2 => comp1.drawInfo.box.y >= comp2.drawInfo.box.y,
                    ),
                );
                if (topElement) {
                    new moveto().move(
                        topElement.extraData.boxElement!.getBoundingClientRect().top - 100,
                        {
                            callback: () => setTimeout(() => this.next(), 300),
                        },
                    );
                } else {
                    setTimeout(() => {
                        this.next();
                    },         300);
                }
            }
            return (async () => {
                if (onBlock) await onBlock();
                await Promise.all(components.map(c => c.draw()));

                await new Promise((resolve) => {
                    this.stepIn = async () => {
                        if (onNext) await onNext();
                        await Promise.all(components.map(c => c.hide()));
                        resolve();
                    };
                });

            })();
        }
    }

    static defaultAnimationBreakpoints:Breakpoint[] = [
        Breakpoint.FixEventBody2AxisMilestone,
        Breakpoint.FixEventAxis2EventAxis,
        Breakpoint.FixEventBody2EventBodyMover,
        Breakpoint.FixEventBody2EventBodyFloater,
    ];
}
