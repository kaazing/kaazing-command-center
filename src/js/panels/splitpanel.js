/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

"use strict";

/**
 * A widget to display a split panel and control resizing of the two 
 * elements.
 */
function defineSplitPanel(Y) {
    Y.SplitPanel = Y.Base.create('splitPanel', Y.Widget, [], {
        initializer: function() {
            var $this = this;

            var topPanel = this.get('topPanel');
            if (topPanel) {
                this.set('topPanel', Y.one(topPanel));
            }

            var bottomPanel = this.get('bottomPanel');
            if (bottomPanel) {
                this.set('bottomPanel', Y.one(bottomPanel));
            }

            // don't generally expect divider to be set, but just in case.
            var divider = this.get('divider');
            if (divider) {
                this.set('divider', Y.one(divider));
            }

            Y.one('window').on('resize', $this.resizeFn, $this);
        },

        /**
         * Render the DOM elements. Called from the Widget.renderer()
         * method, which itself is called from Widget.render(). Appears
         * to be called only once, unless somebody explicitly calls render() again.
         */
        renderUI: function() {
            var $this = this;

            var sizeAttr = $this.getSizeAttr();
            var topAttr = $this.getTopPositionAttr();
            var bottomAttr = $this.getBottomPositionAttr();

            var contentBox = $this.get('contentBox');
            var boundingBox = $this.get('boundingBox');

            var topContainer = $this.get('topContainer');
            if (!topContainer) {
                topContainer = createDIV(contentBox, 'yui3-splitpanel-' + topAttr + '-panel');
                $this.set('topContainer', topContainer);  
            }

            var topPanel = $this.get('topPanel');
            if (topPanel) {
                topContainer.append(topPanel);
            }

            var divider = $this.get('divider');
            if (!divider) {
                divider = createDIV(contentBox, 'yui3-splitpanel-divider')
                    .set('id', 'splitPanelDivider');
                $this.set('divider', divider);
            }

            var bottomContainer = $this.get('bottomContainer');
            if (!bottomContainer) {
                bottomContainer = createDIV(contentBox, 'yui3-splitpanel-' + bottomAttr + '-panel');
                $this.set('bottomContainer', bottomContainer);
            }

            var bottomPanel = $this.get('bottomPanel');
            if (bottomPanel) {
                bottomContainer.append(bottomPanel);
            }

            var contentSize = parseInt(contentBox.getStyle(sizeAttr), 10);
            var dividerSize = $this.getFullSize(divider);  // I assume no margin for the splitter

            // set the positions and sizes of the various boxes.
            // The value given as initialPosition is for the MIDDLE
            // of the splitter, adjusted appropriately for any minimum
            // size of the top and bottom panel.
            var initialPosition = $this.get('initialPosition');
            var dividerPos = 0;

            if (isNumeric(initialPosition)) {
                dividerPos = parseInt(initialPosition, 10);
                if (dividerPos < 0) {
                    dividerPos = contentSize + dividerPos;
                }
            } else if (initialPosition.endsWith('%')) {
                dividerPos = parseInt(initialPosition.substring(0, initialPosition.length-1), 10);
                if (dividerPos < 0) {
                    dividerPos = 100 + dividerPos;
                }
                
                dividerPos = Math.floor(dividerPos * contentSize);
            } else if (initialPosition.endsWith("px")) {
                dividerPos = parseInt(initialPosition.substring(0, initialPosition.length-2), 10);
                if (dividerPos < 0) {
                    dividerPos = contentSize + dividerPos;
                }
            }

            // At this point, dividerPos is the tentative position of the middle. 
            // Now the adjustments. First, get the TOP of divider.
            dividerPos -= Math.floor((dividerSize + 1) / 2);  // allows for odd positions

            dividerPos = Math.max(dividerPos, $this.get('topPanelMinSize') + 1);
            dividerPos = Math.min(dividerPos, contentSize - $this.get('bottomPanelMinSize') - dividerSize);

            topContainer.setStyle(sizeAttr, dividerPos - 1);

            divider.setStyle(topAttr, dividerPos);
            
            bottomContainer.setStyle(topAttr, dividerPos + dividerSize);
            bottomContainer.setStyle(sizeAttr, contentSize - (dividerPos + dividerSize));
            $this.set('desiredBottomSize', contentSize - (dividerPos + dividerSize));

            var drag = new Y.DD.Drag({
                node: '#splitPanelDivider'
            }).plug(Y.Plugin.DDConstrained, {
                        constrain2node: contentBox
                   });
            $this.set('drag', drag);

            drag.on('drag:start', $this.onDragStart, $this);
            drag.on('drag:drag', $this.onDragDrag, $this);

            // Force the drag to only be within the bounds of the contentBox,
            // allowing for the top panel and bottom panel minimum sizes.
            drag.on('drag:align', function(e) {
                var drag = e.target;

                var contentBox = $this.get('contentBox');
                var divider = $this.get('divider');

                // Normally if we could drag anywhere, we'd have the following.
                // drag.actXY = [e.pageX - drag.deltaXY[0], e.pageY - drag.deltaXY[1]];

                var topPanelMinSize = $this.get('topPanelMinSize');
                var bottomPanelMinSize = $this.get('bottomPanelMinSize');

                var sizeAttr = $this.getSizeAttr();
                var min, max, realNew;

                var cbXY = contentBox.getXY();
                var cbSize = parseInt(contentBox.getStyle(sizeAttr), 10);
                var dividerSize = $this.getFullSize(divider);  // includes borders, margins.

                if ($this.isVertical()) {
                    min = cbXY[1] + topPanelMinSize;
                    max = cbXY[1] + cbSize - bottomPanelMinSize - dividerSize;

                    // the real page Y where we should be if we don't constrain things.
                    realNew = e.pageY - drag.deltaXY[1];

                    if (realNew < min) {
                        realNew = min;
                    } else if (realNew > max) {
                        realNew = max;
                    }

                    drag.actXY = [contentBox.getX(), realNew];
                } else {
                    min = cbXY[0] + topPanelMinSize;
                    max = cbXY[0] + cbSize - bottomPanelMinSize - dividerSize;

                    // the real page X where we should be if we don't constrain things.
                    realNew = e.pageX - drag.deltaXY[0];

                    if (realNew < min) {
                        realNew = min;
                    } else if (realNew > max) {
                        realNew = max;
                    }

                    drag.actXY = [realNew, contentBox.getY()];
                }

                e.preventDefault();
            });
        },

        /**
         * Process window-resize events.
         */
        resizeFn: function(ev) {
            var $this = this;

            var sizeAttr = $this.getSizeAttr();
            var topAttr = $this.getTopPositionAttr();

            var contentBox = $this.get('contentBox');
            var cboxSize = parseInt(contentBox.getStyle(sizeAttr), 10);

            var topContainer = $this.get('topContainer');
            var topSize = parseInt(topContainer.getStyle(sizeAttr), 10);
            var topFullSize = $this.getFullSize(topContainer);

            var divider = $this.get('divider');
            var dividerFullSize = $this.getFullSize(divider);

            var bottomContainer = $this.get('bottomContainer');
            var bottomSize = parseInt(bottomContainer.getStyle(sizeAttr), 10);
            var bottomFullSize = $this.getFullSize(bottomContainer);

            var desiredBottomSize = $this.get('desiredBottomSize');

            var totalContentSize = topFullSize + dividerFullSize + bottomFullSize;
            var delta = cboxSize - totalContentSize;  

            // We'll match Eclipse's behavior. As the window grows, grow
            // the bottom until the 'desired bottom size' recorded from the
            // last setup/splitter-move is reached, then the top.
            // As the window shrinks, shrink the top guy until it gets to 
            // its minimum size (by default, 0), then shrink the bottom guy, 
            // but keep around the desired bottom size for later use.
            if (delta > 0) {
                if (bottomFullSize < desiredBottomSize) {
                    // bottom isn't back to its last desired size yet, so 
                    // add back at least some there.
                    if (bottomFullSize + delta <= desiredBottomSize) {
                        // adding the delta to the bottom still won't 
                        // make it big enough so add it all here.
                        bottomContainer.setStyle(sizeAttr, bottomSize + delta);
                        delta = 0;
                    } else {
                        // bottom will be big enough after part of the delta, 
                        // so add that part here, then give the rest to the top.
                        delta = (bottomFullSize + delta - desiredBottomSize);
                        bottomContainer.setStyle(sizeAttr, bottomSize + delta);
                    }
                }

                if (delta > 0) {
                    // give the rest to the top
                    topContainer.setStyle(sizeAttr, topSize + delta);
                    divider.setStyle(topAttr, 
                                     parseInt(divider.getStyle(topAttr), 10) + delta);
                    bottomContainer.setStyle(topAttr, 
                                             parseInt(bottomContainer.getStyle(topAttr), 10) + delta);
                }

            } else if (delta < 0) {
                // The window is shrinking. This is where things get interesting.
                // Switch the sign of delta to positive just to avoid 
                // confusion with double negatives when we add/subtract.
                delta = -delta;

                var topPanelMinSize = $this.get('topPanelMinSize');
                var bottomPanelMinSize = $this.get('bottomPanelMinSize');
                var topDelta;

                if (topFullSize > topPanelMinSize) {
                    // we can shrink the top, at least some.
                    topDelta = topFullSize - topPanelMinSize;  // amt we can shrink

                    topDelta = Math.min(topDelta, delta);  // now topDelta = the actual shrinkage for top

                    topContainer.setStyle(sizeAttr, topSize - topDelta);

                    divider.setStyle(topAttr, parseInt(divider.getStyle(topAttr), 10) - topDelta);
                    bottomContainer.setStyle(topAttr, parseInt(bottomContainer.getStyle(topAttr), 10) - topDelta);
                    delta = delta - topDelta;  // delta is now the amount left to do.
                }

                if (delta > 0) {
                    // whatever delta's left goes to the bottom panel, even if that would put us
                    // under the minimum size.
                    bottomContainer.setStyle(sizeAttr, bottomSize - delta);
                }

            } else {
                // window changing in the non-splitpane direction
            }
        },

        /** 
         * Handler when starting the drag. Store the current X and Y
         * (for vertical only Y is needed, for horizontal only X is needed.)
         */
        onDragStart: function(ev) {
            this.set('lastDivPosition', this.getDivPosition(ev));
        },

        /** 
         * Handler when dragging the divider. We've already allowed for 
         * min and max in drag:align.
         */
        onDragDrag: function(ev) {
            var divPosition = this.getDivPosition(ev);
            var lastDivPosition = this.get('lastDivPosition');

            var delta = (divPosition - lastDivPosition);

            if (delta !== 0) {
                var sizeAttr = this.getSizeAttr();
                var topAttr = this.getTopPositionAttr();

                var topContainer = this.get('topContainer');
                topContainer.setStyle(sizeAttr, (parseInt(topContainer.getStyle(sizeAttr), 10) + delta)); 

                var divider = this.get('divider');
                var top = parseInt(divider.getStyle(topAttr), 10);
                divider.setStyle(topAttr, (top + delta));

                var bottomContainer = this.get('bottomContainer');
                var bottomSize = parseInt(bottomContainer.getStyle(sizeAttr), 10);
                top = parseInt(bottomContainer.getStyle(topAttr), 10);
                bottomContainer.setStyle(topAttr, (top + delta));
                bottomContainer.setStyle(sizeAttr, (bottomSize - delta));
                this.set('desiredBottomSize', (bottomSize - delta));

                this.set('lastDivPosition', divPosition); 
            }
        },

        isVertical: function() {
            return (this.get('direction') === 'vertical');
        },

        /* 
         * Return a position coordinate from a drag event, based on the direction
         * we're configured to move the slider.
         */
        getDivPosition: function(ev) {
            return (this.isVertical() ? ev.pageY : pageX);
        },

        /* 
         * Return the attribute to check for size along the drag direction.
         */
        getSizeAttr: function(ev) {
            return (this.isVertical() ? 'height' : 'width');
        },

        /* 
         * Return the attribute to check for 'top' position along the drag direction
         */
        getTopPositionAttr: function(ev) {
            return (this.isVertical() ? 'top' : 'left');
        },

        /* 
         * Return the attribute to check for 'bottom' position along the drag direction
         */
        getBottomPositionAttr: function(ev) {
            return (this.isVertical() ? 'bottom' : 'right');
        },

        /*
         * Return an element's size in the splitpane direction, 
         * including any border and margin.
         */
        getFullSize: function(element) {
            var sizeAttr = this.getSizeAttr();
            var topPositionAttr = this.getTopPositionAttr();
            var bottomPositionAttr = this.getBottomPositionAttr();

            // For some reason Firefox seems to return null on the margin and border
            // stuff for the splitter, so we'll assume 0. Others seem to be okay,
            // but being careful doesn't hurt.
            var marginTop = element.getStyle('margin-' + topPositionAttr);
            marginTop = (marginTop ? parseInt(marginTop, 10) : 0);

            var borderTop = element.getStyle('border-' + topPositionAttr);
            borderTop = (borderTop ? parseInt(borderTop, 10) : 0);

            var size = parseInt(element.getStyle(sizeAttr), 10);

            var borderBottom = element.getStyle('border-' + bottomPositionAttr);
            borderBottom = (borderBottom ? parseInt(borderBottom, 10) : 0);

            var marginBottom = element.getStyle('margin-' + bottomPositionAttr);
            marginBottom = (marginBottom ? parseInt(marginBottom, 10) : 0);

            var size = marginTop + borderTop + size + borderBottom + marginBottom;
            return size;
        }

    }, {
        ATTRS: {
            container: {
                value: null
            },

            // The panel "direction", 'vertical' or 'horizontal'
            direction: {
                value: 'vertical'
            },

            // node reference to the (split-panel-controlled) div that acts as the
            // viewport to the top panel.
            topContainer: {
                value: null
            },

            // node reference to the (split-panel-controlled) div that acts as the
            // viewport to the bottom panel.
            bottomContainer: {
                value: null
            },

            // Position to set the splitter, relative to the content box.
            // Values can be numbers (means 'px') or numbers followed by % or px.
            // Other values will be ignored, and values < 0 or > the available 
            // space in the split direction will be ignored (or we'll go as close
            // as we can in that direction.)  No setting means split it in half.
            initialPosition: {
                value: "50%"
            },

            // If set, indicates that we've tried to shrink things to the point where
            // the bottom container had to shrink because the top is at min size (by
            // default, 0.) The value is only changed when the user moves the divider bar.
            desiredBottomSize: {
                value: null  
            },

            // node reference or string for a DIV used for *content* of top/left panel
            topPanel: {
                value: null 
            },

            topPanelMinSize: {
                value: 0
            },

            // node reference or string for a DIV used for *content* of bottom/right panel
            bottomPanel: {
                value: null
            },

            bottomPanelMinSize: {
                value: 0
            },

            // node reference to the divider between panels
            divider: {
                value: null 
            },

            // latest position of the divider, in the direction the divider is moving
            // (e.g. the last Y coordinate when moving up and down, the last X when
            // moving side to side.
            lastDivPosition: {
                value: null
            },
        }
    });
}
