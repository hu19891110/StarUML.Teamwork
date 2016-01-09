define(function(require, exports, module) {
    "use strict";
    //Modules
    var PreferenceManager   = app.getModule("core/PreferenceManager");
    var Dialogs             = app.getModule('dialogs/Dialogs');
    var Toast 				= app.getModule("ui/Toast");
    var FileSystem          = app.getModule("filesystem/FileSystem");
    var Repository      	= app.getModule("core/Repository");

    //Imports
    var TeamworkBase        = require("./TeamworkBase");
    var GitConfiguration    = require("../preferences/TeamworkConfiguration");
    var ProgressDialog      = require("../dialogs/ProgressDialog");
    var TeamworkView        = require("../teamworkView/TeamworkView");
    var GitApi              = require("../StarGit/api-built");
    var TeamworkConfiguration   = require("../preferences/TeamworkConfiguration");

    //Constants
    //Functions
    function updateProject() {
        var projectName = TeamworkBase.getTeamworkProjectName();
        var workingDirPromise = getProjectWorkDir(projectName);
        var currentProjectPromise = loadCurrentProjectFromServer(workingDirPromise, projectName);
        var mergePromise = mergeProjectWithLocalChanges(currentProjectPromise);
        TeamworkBase.loadProjectFromFragments(mergePromise, projectName);
        notifyUserAfterwards(mergePromise, projectName);
    }

    function mergeProjectWithLocalChanges(promise) {
        var nextPromise = new $.Deferred();
        promise.done(function(workingDir, projectName) {
            try {
                TeamworkBase.splitProjectInSingleFiles(false, projectName, false);
            } catch(error) {
                nextPromise.reject();
            }
            var options = {
                dir: workingDir,
                name: TeamworkConfiguration.getUsername(),
                email: TeamworkConfiguration.getUsername() + '@noreply.com',
                commitMsg: "Committing local changes"
            };
            GitApi.commit(options, function() {
                    var progressCallback = ProgressDialog.showProgress("Updating Project", "Connecting to server...");
                    options = TeamworkBase.getDefaultGitOptions(workingDir, undefined, progressCallback);
                    GitApi.pull(options, function() {
                        nextPromise.resolve(workingDir, projectName);
                    },
                    function(error) {
                        TeamworkBase.handleGitApiError(workingDir, error)
                    });
            },
            function (err) {
                handleGitApiError(workingDir, err);
            });
        });
        return nextPromise;
    }

    function getProjectWorkDir(projectName) {
        var promise = new $.Deferred();
        var localPath = TeamworkBase.loadLocalWorkingPath(projectName);
        var workingDir = FileSystem.getDirectoryForPath(localPath);
        workingDir.unlink();
        TeamworkBase.getProjectsRootDir(localPath, function (workingDir) {
            promise.resolve(workingDir);
        });
        return promise;
    }

    function loadCurrentProjectFromServer(promise, projectName) {
        var nextPromise = new $.Deferred();
        promise.done(function(workingDir) {
            var clonePromise  = TeamworkBase.cloneRepoFromServer(workingDir, projectName);
            clonePromise.done(function(workingDir, projectName) {
                nextPromise.resolve(workingDir, projectName);
            });
        });
        return nextPromise;
    }

    function notifyUserAfterwards(promise, projectName) {
        promise.done(function() {
            TeamworkView.addProjectUpdateEvent(projectName, GitConfiguration.getUsername());
            Dialogs.cancelModalDialogIfOpen('modal');
            $(exports).triggerHandler('projectUpdated', [projectName]);
        });
    }

    exports.updateProject = updateProject;
});