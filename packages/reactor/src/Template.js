import ReactDOM from 'react-dom';
import ReactDOMServer from 'react-dom/server';

const Ext = window.Ext;

/**
 * A implementation of Ext.Template that supports React elements (JSX).
 * 
 * Usage:
 * 
 *  const tpl = new Template(data => (
 *      <div>
 *          <div>{data.firstName} {data.lastName}</div>    
 *          <div>{data.title}</div>
 *      </div>
 *  ))
 * 
 *  const html = tpl.apply({ firstName: 'Joe', lastName: 'Smith', title: 'CEO' });
 */
const Template = Ext.define(null, {
    extend: 'Ext.Template', 

    /**
     * @param {Function} fn A function that takes data values as an object and returns a React.Element to be rendered.
     */
    constructor(fn) {
        this.fn = fn;
    },

    // overrides Ext.Template
    apply(values) {
        return ReactDOMServer.renderToStaticMarkup(this.fn(values));
    },

    // overrides Ext.Template
    doInsert(where, el, values, returnElement) {
        const target = this.getCachedTarget();
        this.doRender(values, target);
        const dom = target.firstChild;
        const result = Ext.dom.Helper.doInsert(el, dom, returnElement, where);
        this.unmountChildrenOnRemove(dom);
        return result;
    },

    // overrides Ext.Template
    overwrite(el, values, returnElement) {
        const dom = Ext.getDom(el);
        const result = this.doRender(values, dom);
        this.unmountChildrenOnRemove(dom);
        return returnElement ? new Ext.Element(dom) : dom;
    },

    /**
     * @private
     * @return {HTMLElement}
     */
    getCachedTarget() {
        if (!this.cachedTarget) this.cachedTarget = document.createElement('div');
        return this.cachedTarget;
    },

    /**
     * Renders the result of this.fn to the specified target
     * @private
     * @param {Object} values Values to pass to this.fn
     * @param {HTMLElement} target The element into which the result should be rendered.
     * @return {HTMLElement} The newly rendered element
     */
    doRender(values, target) {
        const reactElement = this.fn(values);
        ReactDOM.render(reactElement, target);
        return target.firstChild;
    },

    /**
     * Ensures that componentWillUnmount is called on each descendent component when the target node is removed from the DOM.
     * @param {Node} target A node containing a React tree
     */
    unmountChildrenOnRemove(target) {
        const parent = target.parentNode;
        const parentKey = '$reactorObserveRemoveChild';
        const targetKey = '$reactorUnmountOnRemove';
        target[targetKey] = true; // we tag the target with $reactorUnmountOnRemove so we know it has a React tree to unmount when removed

        if (!parent[parentKey]) { // we tag the parent with $reactorObserveRemoveChild so we can ensure we are only observing it once
            parent[parentKey] = true;

            const observer = new MutationObserver(mutations => {
                mutations.forEach(({ removedNodes }) => {
                    for (let i=0; i<removedNodes.length; i++) {
                        let node = removedNodes[i];

                        if (node[targetKey]) {
                            ReactDOM.unmountComponentAtNode(node); // Unmount the React tree when the target dom node is removed.
                        }
                    }
                })
            });
            
            observer.observe(parent, { childList: true });
        }
    }
});

export default Template;

// Hook Ext.XTemplate.get so that we can just pass a function that returns JSX in place of a XTemplate.

