var RegexEditor = (function() {
    /* TODO(Joshua): Add more TODOs and comments so that I don't get lost in my own code. 
       That would be embarrassing */
    /* TODO(Joshua): Use mutation observers so that editors will update even when the output
       is changed via code */
    var methods = {
        debugGroups: {
            editor: false,
            parser: false,
            methods: false
        }
    };

    function debugLog(log) {
        /* Method for logging data to the console with extra candy features */
        /* For every argument after the first... */
        for (var i = 1; i < arguments.length; i ++) {
            /* ...if it is the key to an active debug group... */
            if (methods.debugGroups[arguments[i]]) {
                /* ...log our message to the console and exit */
                console.log(log);
                return;
            }
        }
    }

    var util = {};

    var editors = {};

    var parsers = {};


    /* EDITOR */
    var cfgDefaults = {
        required: {
            editor: "string"
        },
        optional: {
            output: "",
            live: true,
            flavor: "js"
        }
    };

    util.getEditor = function(id) {
        /* Wrapper method for getting an editor so that we can be consistent in methods.editor */
        return editors[id];
    }

    util.setEditor = function(id, cfg) {
        /* Method to create a new editor with id id, and config object cfg, used in methods.editor */
        if (cfg === undefined) cfg = {};
        var valid = true;
        for (var i in cfgDefaults.required) {
            var type = typeof cfg[i];
            var acceptableTypes = cfgDefaults.required[i]
            if (acceptableTypes.indexOf(type) === -1) {
                valid = false;
                console.error("ERROR[RegexEditor]: Required config data " + i + " is of an unacceptable type (Type:" + type + "). Acceptable types are [" + acceptableTypes + "]", "editor")
            }
        }
        for (var i in cfgDefaults.optional) {
            if (cfg[i] === undefined) {
                cfg[i] = cfgDefaults.optional[i];
            }
        }
        if (valid) {
            return new Editor(id, cfg);
        }
    }

    methods.editor = function(id) {
        /* Method used to create and get editors and editor data */
        debugLog("ALERT[RegexEditor][editor](1):Attempting to get editor \"" + id + "\"...", "editor");
        if (editors[id] !== undefined) {
            debugLog("ALERT[RegexEditor][editor](2):Returning editor \"" + id + "\"...", "editor");
            return util.getEditor(id);
        } else {
            debugLog("ALERT[RegexEditor][parser](2):Failed to find editor \"" + id + "\", returning creation object instead...", "editor");
            return {
                create: util.setEditor.bind(null, id)
            }
        }
    }



    function Editor(id, cfg) {
        /* Constructor for creating a new editor with the id id and the config values cfg */
        if (!(this instanceof Editor)) return new Editor(id, cfg);
        debugLog("ALERT[RegexEditor][Editor](1):Initiating new Editor object with id \"" + id + "\" and config object " + cfg + "...", "editor");
        /* TODO(Joshua): Make sure that getElementById isn't returning something like the body node (or even worse, html!) and if so, refuse to work and throw a warning */
        this.regexEditor = document.getElementById(cfg.editor);
        if (!this.regexEditor) {
            console.warn("WARNING[RegexEditor][Editor]: getElementById for editor config value returned a falsy value, creating a new element...");
            this.regexEditor = document.createElement("div");
        }
        this.regex = document.createElement("div");

        this.outputEditor = document.getElementById(cfg.output);
        if (!this.outputEditor) {
            console.warn("WARNING[RegexEditor][Editor]: getElementById for output config value returned a falsy value, creating a new element...");
            this.outputEditor = document.createElement("div");
        }
        this.output = document.createElement("div");

        this.flavor = cfg.flavor;

        this.id = id;

        this.expression = new RegExp();

        this.init();
    }

    Editor.prototype = {
        init: function() {
            /* Method for initiating an Editor object, called whenever the editor constructor
               is called (with new) */
            debugLog("ALERT[RegexEditor][Editor][init](1):Setting up editor \"" + this.id + "\"...", "editor");
            /* Turn off spellcheck on our editor elements and make them editable */
            this.regexEditor.setAttribute("spellcheck", false);
            this.regexEditor.setAttribute("contenteditable", true);

            this.outputEditor.setAttribute("spellcheck", false);
            this.outputEditor.setAttribute("contenteditable", true);

            /* Listen for input on our elements */
            this.regexEditor.addEventListener("input", this.updateExpression.bind(this));
            this.outputEditor.addEventListener("input", this.updateOutput.bind(this));

            /* Add the necessary classes to our editors for styling and other stuff */
            this.regexEditor.className += " regex-editor editor";
            this.outputEditor.className += " output-editor editor";

            this.regex.className = "regex-formatting editor editor-underlay";
            this.output.className = "output-formatting editor editor-underlay"

            /* Update the display of our editors */
            this.updateRegexEditorDisplay();
            this.updateOutputEditorDisplay();

            /* Append our styling underlays */
            this.regexEditor.parentNode.insertBefore(this.regex, this.regexEditor);
            this.outputEditor.parentNode.insertBefore(this.output, this.outputEditor);

            /* Listen for scroll events on the editors so that we can scroll the underlays as well */
            this.regexEditor.addEventListener("scroll", (function() {
                this.regex.scrollTop = this.regexEditor.scrollTop;
            }).bind(this))

            this.regexEditor.addEventListener("keypress", function(event) {
                if (event.charCode === 13) {
                    event.preventDefault();
                }
            })

            this.outputEditor.addEventListener("scroll", (function(event) {
                this.output.scrollTop = this.outputEditor.scrollTop;
            }).bind(this))            

            this.outputEditor.addEventListener("keypress", (function(event) {
                var append = false;
                var nodeToAppend = null;
                var nodeTypeToAppend = "";
                if (event.charCode === 13) {
                    nodeToAppend = document.createElement("br");
                    nodeTypeToAppend = "br";
                    append = true;
                }

                if (append) {
                    event.preventDefault();
                    if (window.getSelection) {
                        var selection = window.getSelection();
                        var range = selection.getRangeAt(0);
                        range.deleteContents();
                        console.log(range.endOffset + " : " + this.outputEditor.textContent.length);
                        range.insertNode(nodeToAppend);
                        range.setStartAfter(nodeToAppend);
                        range.setEndAfter(nodeToAppend);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    this.updateOutput();
                }
            }).bind(this));

            /* Call our first update so we have highlighting */
            this.updateExpression();

            /* Finally, add our editor to the dictionary of editors */
            editors[this.id] = this;
        },
        updateRegexEditorDisplay: function() {
            /* Updates the display of the regexEditor so that it stays on top of the content, will need to be manually called by users since
               there's no good way to check for changes in an elements position or dimensions */
            underlayElement(this.regex, this.regexEditor);

            this.regex.style.color = "rgba(0, 0, 0, 0)";

            this.regex.textContent = this.regexEditor.textContent;
        },
        updateOutputEditorDisplay: function() {
            /* Does the same thing as updateRegexEditorDisplay for the outputEditor */
            underlayElement(this.output, this.outputEditor);

            this.output.style.color = "rgba(0, 0, 0, 0)";

            this.output.textContent = this.outputEditor.textContent;
        },
        updateExpression: function() {
            /* This method is bound to the input event on regexEditor and called when the editor is created. It updates the expression and calls the updateOutput method if the expression is a valid one */
            var nextExpression = this.regexEditor.textContent;
            this.regex.innerHTML = parsers[this.flavor].format(nextExpression);
            debugLog("ALERT[RegexEditor][Editor][updateExpression](1):Checking if \"" + nextExpression + "\" is a valid \"" + this.flavor + "\" regular expression...", "editor");
            if (parsers[this.flavor].valid(nextExpression)) {
                try {
                    debugLog("ALERT[RegexEditor][Editor][updateExpression](2):Attempting to set expression for editor \"" + nextExpression + "\"...", "editor")
                    this.expression = parsers[this.flavor].toRegExp(nextExpression);
                } catch(error) {
                    console.error("ERROR[RegexEditor][Editor][updateExpression]:User entered an invalid expression body. Exiting method...", "editor");
                    return;
                }
                this.updateOutput();
            }
        },
        updateOutput: function() {
            /* This method is bound to the input event on outputEditor and called whenever updateExpression is
               called. It updates the output element, highlighting matches to the expression within the output */
            debugLog("ALERT[RegexEditor][Editor][updateOutput](1):Updating \"output\" element...", "editor");
            var testString = this.outputEditor.innerHTML.replace(
                /<br>|<br><\/br>|<br\/>/gi,
                "\n"
            );
            var testArray = [];
            var formattedHTML = "";

            var lastEnd = 0;
            testString.replace(this.expression, function(match) {
                var offset = arguments[arguments.length - 2];
                formattedHTML += unHtml(testString.substring(lastEnd, offset)) + 
                                 "<span class='match'>" +
                                 unHtml(match) +
                                 "</span>";

                lastEnd = offset + match.length;
                return match;
            });
            
            this.output.innerHTML = formattedHTML.replace(/\n/g, "<br>");
        }
    };



    function unHtml(str) {
        /* Method to unHtml a string (make it so that setting an elements
           innerHTML property to it won't do anything wierd) */
        var unHtmledStr = "";
        for (var i = 0; i < str.length; i ++) {
            if (str[i] !== "\n") {
                var codeStr = str.charCodeAt(i).toString(16).toUpperCase();
                while (codeStr.length < 4) {
                    codeStr = "0" + codeStr;
                }
                unHtmledStr += "&#x" + codeStr + ";";
            } else {
                unHtmledStr += str[i];
            }
        }

        return unHtmledStr;
    }

    function getMatches(expression, string) {
        /* This method returns an array of all the matches to an expression in a specific test string
           along with data about said matches */
        debugLog("ALERT[RegexEditor][getMatches](1):Getting matches to expression \"" + expression + "\" in string \"" + string + "\"...", "methods");
        var matches = [];
        if (expression.global === true) {
            var match = expression.exec(string);
            while (match !== null) {
                matches.push(match);
                match = expression.exec(string)
            }
        } else {
            matches.push(expression.exec(string));
        }
        debugLog("ALERT[RegexEditor][getMatches](2):Returning " + matches.length + " matches...", "methods");
        return matches;
    }

    function underlayElement(underEl, overEl) {
        /* Method to overlay one HTMLElement on top of another */
        var overStyle = window.getComputedStyle(overEl);
        
        underEl.style.position = "absolute";
        underEl.style.top = overEl.offsetTop + "px";
        underEl.style.left = overEl.offsetLeft + "px";

        var paddingTotalX = 
            (parseInt(overStyle.paddingLeft.substr(0, overStyle.paddingLeft.length - 2)) || 0) + 
            (parseInt(overStyle.paddingRight.substr(0, overStyle.paddingRight.length - 2)) || 0);
        underEl.style.width = (overEl.offsetWidth - paddingTotalX) + "px";

        var paddingTotalY = 
            (parseInt(overStyle.paddingLeft.substr(0, overStyle.paddingTop.length - 2)) || 0) + 
            (parseInt(overStyle.paddingRight.substr(0, overStyle.paddingBottom.length - 2)) || 0);
        underEl.style.height = (overEl.offsetHeight - paddingTotalY) + "px";

        underEl.style.fontSize = overStyle.fontSize;
        underEl.style.fontFamily = overStyle.fontFamily;

        underEl.style.paddingTop = overStyle.paddingTop;
        underEl.style.paddingLeft = overStyle.paddingLeft;
        underEl.style.paddingRight = overStyle.paddingRight;
        underEl.style.paddingBottom = overStyle.paddingBottom;

        underEl.style.zIndex = (parseInt(overStyle.zIndex) || 0) - 1;

        //overEl.style.color = underStyle.color;
    }



    /* PARSER */
    util.getParser = function(flavor) {
        /* Wrapper method for getting a parser so that we can be consistent in methods.parser */
        return parsers[flavor];
    }

    util.setParser = function(flavor, cfg) {
        /* Method used to create a new parser object of flavor flavor with data cfg */
        if (cfg === undefined) cfg = {};
        /*
        {
            valid: a regex to test whether an expression is valid (used by the editor to make sure it doesn't try to update with an invalid regex)
            toRegExp: a function to convert the input string into a javascript RegExp object
            fromRegExp: a function to convert a javascipt RegExp object into a textual representation of a regular expression in the specified flavor
        }
        */
        return new Parser(flavor, cfg);
    }

    methods.parser = function(flavor) {
        /* Method used to get and set parsers and parser data */
        debugLog("ALERT[RegexEditor][parser](1):Attempting to get flavor \"" + flavor + "\" parser...", "parser")
        if (parsers[flavor] !== undefined) {
            debugLog("ALERT[RegexEditor][parser](2):Returning flavor \"" + flavor + "\" parser...", "parser");
            return util.getParser(flavor);
        } else {
            debugLog("ALERT[RegexEditor][parser](2):Failed to find flavor \"" + flavor + "\" parser, returning creation object instead...", "parser");
            return {
                create: util.setParser.bind(null, flavor)
            }
        }
    }



    function Parser(flavor, cfg) {
        /* This method is used for creating a new Parser object */
        /* Don't know how useful having a constructor for parser is since I don't use the constructor in any unique way but I'm keeping it because it looks nicer and I may need it in the future*/
        debugLog("ALERT[RegexEditor][Parser](1):Initiating new Parser object of flavor \"" + flavor + "\" with config object " + cfg + "...", "parser");
        this.flavor = flavor;
        for (var i in cfg) {
            this[i] = cfg[i];
        }
        parsers[this.flavor] = this;
    }



    /* SETUP */
    methods.parser("js").create({
        valid: function(input) {
            debugLog("ALERT[RegexEditor][parsers][js][valid](1):Checking if a string is a valid js flavor regular expression...", "parser");
            return /^\/(?:.+)\/(?:[gimyu]+|)$/.test(input);
        },
        toRegExp: function(input) {
            debugLog("ALERT[RegexEditor][parsers][js][toRegExp](1):Parsing a JavaScript regular expression string into a RegExp object...", "parser");
            var regexArgs = input.match(/\/(.+|)\/([gimyu]+|)/);
            if (regexArgs === null || regexArgs.length === 0) {
                debugLog("ALERT[RegexEditor][parsers][js][toRegExp](2):No parameters discovered, creating an empty RegExp object...", "parser");
                return new RegExp("");
            } else if (regexArgs.length >= 3) {
                debugLog("ALERT[RegexEditor][parsers][js][toRegExp](2):Expression body and flags found, creating a RegExp object...", "parser");
                return new RegExp(regexArgs[1], regexArgs[2] || "");
            }
        },
        fromRegExp: function(input) {
            debugLog("ALERT[RegexEditor][parsers][js][fromRegExp](1):Converting a RegExp object to a string...");
            return input.toString();
        },
        format: function(input) {
            input = input.replace()
            return input;
        }
    })



    return methods;
})();

RegexEditor.editor("test-editor").create({
    editor: "editor",
    output: "test",
    live: true,
    flavor: "js"
});