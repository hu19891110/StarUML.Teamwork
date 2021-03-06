/**
 * Copyright (c) 2016 Michael Seiler. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction, including without
 * limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */
define(function(require, exports, module) {
    "use strict";

    //Modules
    var Async = app.getModule("utils/Async");

    //Constants
    var PROJECT_TYPE_PROPERTY     = "Project";
    var PARENT_PROPERTY           = "_parent";
    var DIAGRAM_DEFAULT_PROPERTY  = "defaultDiagram";
    var VIEW_MODEL_PROPERTY       = "model";

    //Functions
    function buildProjectFromFragments(fragments) {
        type.Element.prototype.newElement = false;
        var _project;
        for (var item in fragments) {
            var fragment = fragments[item];
            _project = checkIfFragmentIsProjectRoot(fragment, _project);
            addFragmentToProject(fragment, fragments);
            fragments[item] = fragment;
        }
        _project = fragments[_project._id];
        return _project;
    }

    function loadFragmentsAsJsonObjects(content) {
        var fragments = [];
        var masterPromise = Async.doSequentially(content, function (item, index) {
            var promise = new $.Deferred();
            if(item.isFile) {
                item.read(function (err, data, stats) {
                    var json = JSON.parse(data);
                    fragments[json._id] = json;
                    promise.resolve();
                });
            } else {
                promise.resolve();
            }
            return promise.promise();
        }, false);
        return {fragments: fragments, masterPromise: masterPromise};
    }

    function addViewToOwnedViews(parent, fragment) {
        if (parent.ownedViews === undefined) {
            parent.ownedViews = [];
        }
        parent.ownedViews.push(fragment);
        return parent;
    }

    function addSubViewToView(parent, fragment) {
        if (parent.subViews === undefined) {
            parent.subViews = [];
        }
        parent.subViews.push(fragment);
        return parent;
    }

    function addElementToOwnedElements(parent, fragment) {
        if (parent.ownedElements === undefined) {
            parent.ownedElements = [];
        }
        parent.ownedElements.push(fragment);
        return parent;
    }

    function checkIfFragmentIsProjectRoot(fragment, project) {
        if (fragment._type === PROJECT_TYPE_PROPERTY) {
            return fragment;
        }
        return project;
    }

    function hasFragmentParent(fragment) {
        return fragment.hasOwnProperty(PARENT_PROPERTY);
    }

    function isFragmentOfTypeDiagram(parent) {
        return parent.hasOwnProperty(DIAGRAM_DEFAULT_PROPERTY);
    }

    function isFragmentView(parent) {
        return parent.hasOwnProperty(VIEW_MODEL_PROPERTY) || parent.hasOwnProperty("fillColor") || parent.hasOwnProperty("visible");
    }

    function addFragmentToProject(fragment, fragments) {
        if (hasFragmentParent(fragment)) {
            var parentId = fragment._parent.$ref;
            var parent = fragments[parentId];
            if (isFragmentOfTypeDiagram(parent)) {
                parent = addViewToOwnedViews(parent, fragment);
            } else if (isFragmentView(parent)) {
                parent = addSubViewToView(parent, fragment);
            } else {
                parent = addElementToOwnedElements(parent, fragment);
            }
        }
        return {parentId: parentId, parent: parent};
    }

    //Backbone
    exports.loadFragmentsAsJsonObjects = loadFragmentsAsJsonObjects;
    exports.buildProjectFromFragments = buildProjectFromFragments;
});