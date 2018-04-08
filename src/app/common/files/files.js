angular.module('orderCloud')
    .factory('FileReader', fileReader)
    .factory('FilesService', FilesService)
    .directive('ordercloudFileUpload', ordercloudFileUpload)
    .directive('ordercloudPoUpload', ordercloudPoUpload)
    .directive('rsmFileUploader',rsmFileUploader)
;

//TODO: update the New SDK to have a file Upload method similar to how this works.  Minus attaching the file info to any XP
function fileReader($q, $timeout) {
    var service = {
        ReadAsDataUrl: _readAsDataURL
    };

    function onLoad(reader, deferred, scope) {
        return function() {
            $timeout(function() {
                deferred.resolve(reader);
            }, 5000);
        };
    }

    function onError(reader, deferred, scope) {
        return function() {
            $timeout(function() {
                deferred.reject(reader);
            }, 5000);
        };
    }

    function onProgress(reader, scope) {
        return function(event) {
            scope.$broadcast('fileProgress',
                {
                    total: event.total,
                    loaded: event.loaded
                });
        };
    }

    function getReader(deferred, scope) {
        var reader = new FileReader();
        reader.onload = onLoad(reader, deferred, scope);
        reader.onerror = onError(reader, deferred, scope);
        reader.onprogress = onProgress(reader, scope);
        return reader;
    }

    function _readAsDataURL(file, scope) {
        var deferred = $q.defer();

        var reader = getReader(deferred, scope);
        reader.readAsDataURL(file);

        return deferred.promise;
    }

    return service;
}

function FilesService($q,fileStore) {
    var service = {
        Get: _get,
        Upload: _upload,
        Delete: _delete
    };

    AWS.config.region = fileStore.awsRegion;
    AWS.config.update({ accessKeyId: fileStore.akid, secretAccessKey: fileStore.sak });

    function randomString() {
        var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var string_length = 15;
        var randomstring = '';
        for (var i = 0; i < string_length; i++) {
            var rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum, rnum + 1);
        }
        return randomstring;
    }

    function _get(fileKey) {
        var deferred = $q.defer();
        var s3 = new AWS.S3();
        var params = {Bucket: fileStore.bucket, Key: fileKey};
        s3.getObject(params, function (err, data) {
            err ? console.log(err) : console.log(data);
            deferred.resolve(data);
        });
        return deferred.promise;
    }

    function _upload(file, fileName) {
        var deferred = $q.defer();
        var s3 = new AWS.S3();
        var params = {Bucket: fileStore.bucket, Key: fileName, ContentType: file.type, Body: file};
        s3.upload(params, function (err, data) {
            err ? console.log(err) : console.log(data);
            deferred.resolve(data);
        });
        return deferred.promise;
    }

    function _delete(fileKey) {
        var deferred = $q.defer();
        var s3 = new AWS.S3();
        var params = {Bucket: fileStore.bucket, Key: fileKey};
        s3.deleteObject(params, function (err, data) {
            err ? console.log(err) : console.log(data);
            deferred.resolve(data);
        });
        return deferred.promise;
    }

    return service;
}

function ordercloudFileUpload($parse, $sce, Underscore, FileReader, FilesService, OrderCloudSDK, fileStore, WeirService, FileSaver) {
    var directive = {
        scope: {
            model: '=',
            keyname: '@',
            label: '@',
            extensions: '@',
            invalidExtension: '@'
        },
        restrict: 'E',
        templateUrl: 'common/files/templates/files.tpl.html',
        replace: true,
        link: link
    };

    function link(scope, element, attrs) {
        var file_input = $parse('file');
        var file_control = angular.element(element.find('input'))[0];
        var el = element;
	    var orderid = null;
	    if(scope.model.xp.OriginalOrderID == null) {
		    orderid = scope.model.ID;
	    } else {
		    orderid = scope.model.xp.OriginalOrderID
	    }
        scope.fileStore = fileStore;
        scope.invalidExtension = false;

	    var labels = {
	    	en: {
	    		SelectFiles: "Select file to upload",
			    Invalid: "Invalid File Type"
		    },
		    fr: {
			    SelectFiles: $sce.trustAsHtml("Sélectionner le fichier à importer"),
			    Invalid: $sce.trustAsHtml("Type de fichier invalide")
		    }
	    };
	    scope.labels = WeirService.LocaleResources(labels);

        scope.upload = function() {
            $('#orderCloudUpload').click();
        };

        scope.get = function(fileName) {
            FilesService.Get(orderid + fileName)
                .then(function(fileData) {
                    console.log(fileData);
                    var file = new Blob([fileData.Body], {type: fileData.ContentType});
	                FileSaver.saveAs(file, fileName);
                    //var fileURL = URL.createObjectURL(file);
                    //window.open(fileURL, "_blank");
                });
        };

        scope.remove = function(fileName) {
            console.log(fileName);
            FilesService.Delete(orderid + fileName)
                .then(function(fileData) {
                    var index = scope.model.xp[scope.keyname].indexOf(fileName);
                    if(index > -1) {
                        scope.model.xp[scope.keyname].splice(index,1);
                        var xp = {"xp": {
                            "Files": scope.model.xp[scope.keyname]
                        }};
                        return OrderCloudSDK.Orders.Patch("Outgoing", scope.model.ID, xp);
                    }
                })
        };

        function afterSelection(file, fileName) {
	        var uniqueFileName = orderid + fileName;

            FilesService.Upload(file, uniqueFileName)
                .then(function(fileData) {
                    if (!scope.model.xp) scope.model.xp = {};
                    if (!scope.model.xp[scope.keyname]) scope.model.xp[scope.keyname] = [];
                    scope.model.xp[scope.keyname].push(fileName);
                    var xp = {"xp": {
                        "Files": scope.model.xp[scope.keyname]
                    }};
                    return OrderCloudSDK.Orders.Patch("Outgoing", scope.model.ID, xp);
                });
        }

        var allowed = {
            Extensions: [],
            Types: []
        };

        if (scope.extensions) {
            var items = Underscore.map(scope.extensions.split(','), function(ext) { return ext.replace(/ /g ,'').replace(/\./g, '').toLowerCase() });
            angular.forEach(items, function(item) {
                if (item.indexOf('/') > -1) {
                    if (item.indexOf('*') > -1) {
                        allowed.Types.push(item.split('/')[0]);
                    }
                    else {
                        allowed.Extensions.push(item.split('/')[1]);
                    }
                }
                else {
                    allowed.Extensions.push(item);
                }
            });
        }

        function updateModel(event) {
            switch (event.target.name) {
                case 'upload':
                    if (event.target.files[0] == null) return;
                    var fileName = event.target.files[0].name;
                    var valid = true;
                    if ((allowed.Extensions.length || allowed.Types.length) && fileName) {
                        var ext = fileName.split('.').pop().toLowerCase();
                        valid = (allowed.Extensions.indexOf(ext) !== -1 || allowed.Types.indexOf(event.target.files[0].type.split('/')[0]) > -1);
                    }
                    if (valid) {
                        scope.invalidExtension = false;

                        FileReader.ReadAsDataUrl(event.target.files[0], scope)
                            .then(function(f) {
                                afterSelection(event.target.files[0], fileName);
                            });
                        file_input.assign(scope, event.target.files[0]);

                    } else {
                        scope.$apply(function() {
                            scope.invalidExtension = true;
                            var input;
                            event.target.files[0] = null;
                            el.find('input').replaceWith(input = el.find('input').clone(true));
                            if (!scope.model.xp) scope.model.xp = {};
                            scope.model.xp[scope.keyname] = null;
                        });
                    }
                    break;
            }
        }

        element.bind('change', updateModel);
    }

    return directive;
}

function ordercloudPoUpload($parse, $exceptionHandler, $sce, Underscore, FileReader, FilesService, OrderCloudSDK, fileStore, WeirService, FileSaver) {
    var directive = {
        scope: {
            model: '=',
            keyname: '@',
            label: '@',
            extensions: '@',
            invalidExtension: '@'
        },
        restrict: 'E',
        templateUrl: 'common/files/templates/po.tpl.html',
        replace: true,
        link: link
    };

    function link(scope, element, attrs) {
        var file_input = $parse('file');
        var file_control = angular.element(element.find('input'))[0];
        var el = element;
	    var orderid = null;
	    if(scope.model.xp.OriginalOrderID == null) {
		    orderid = scope.model.ID;
	    } else {
		    orderid = scope.model.xp.OriginalOrderID
	    }
        scope.fileStore = fileStore;
        scope.invalidExtension = false;

        scope.upload = function() {
            $('#orderCloudUpload').click();
        };

	    var labels = {
		    en: {
			    SelectFiles: "Select PO file to upload.",
			    Invalid: "Invalid File Type"
		    },
		    fr: {
			    SelectFiles: $sce.trustAsHtml("Sélectionner le fichier PO à importer"),
			    Invalid: $sce.trustAsHtml("Invalid File Type")
		    }
	    };
	    scope.labels = WeirService.LocaleResources(labels);

        scope.get = function(fileName) {
            FilesService.Get(orderid + fileName)
                .then(function(fileData) {
                    console.log(fileData);
                    var file = new Blob([fileData.Body], {type: fileData.ContentType});
	                FileSaver.saveAs(file, fileName);
                    //var fileURL = URL.createObjectURL(file);
                    //window.open(fileURL, "_blank");
                });
        };

        scope.remove = function(fileName) {
            console.log(fileName);
            FilesService.Delete(orderid + fileName)
                .then(function(fileData) {
                    if(scope.model.xp[scope.keyname]) {
                        scope.model.xp[scope.keyname] = null;
                        var xp = {"xp": {
                            "PODocument": null
                        }};
                    }
                    return OrderCloudSDK.Orders.Patch("Outgoing", orderid, xp);
                })
        };

	    scope.GetFileUrl = function(fileName) {
		    var encodedFileName = encodeURIComponent(fileName);

		    return scope.fileStore.location + orderid + encodedFileName;
	    };

        function afterSelection(file, fileName) {
	        var uniqueFileName = orderid + fileName;

            FilesService.Upload(file, uniqueFileName)
                .then(function(fileData) {
                    if (!scope.model.xp) scope.model.xp = {};
                    if (!scope.model.xp[scope.keyname]) scope.model.xp[scope.keyname] = fileName;
                    var xp = {"xp": {
                        "PODocument": fileName
                    }};
                    return OrderCloudSDK.Orders.Patch("Outgoing", scope.model.ID, xp);
                })
                .catch(function(ex){
                    $exceptionHandler(ex);
                });
        }

        var allowed = {
            Extensions: [],
            Types: []
        };

        if (scope.extensions) {
            var items = Underscore.map(scope.extensions.split(','), function(ext) { return ext.replace(/ /g ,'').replace(/\./g, '').toLowerCase() });
            angular.forEach(items, function(item) {
                if (item.indexOf('/') > -1) {
                    if (item.indexOf('*') > -1) {
                        allowed.Types.push(item.split('/')[0]);
                    }
                    else {
                        allowed.Extensions.push(item.split('/')[1]);
                    }
                }
                else {
                    allowed.Extensions.push(item);
                }
            });
        }

        function updateModel(event) {
            switch (event.target.name) {
                case 'upload':
                    if (event.target.files[0] == null) return;
                    var fileName = event.target.files[0].name;
                    var valid = true;
                    if ((allowed.Extensions.length || allowed.Types.length) && fileName) {
                        var ext = fileName.split('.').pop().toLowerCase();
                        valid = (allowed.Extensions.indexOf(ext) != -1 || allowed.Types.indexOf(event.target.files[0].type.split('/')[0]) > -1);
                    }
                    if (valid) {
                        scope.invalidExtension = false;

                        FileReader.ReadAsDataUrl(event.target.files[0], scope)
                            .then(function(f) {
                                afterSelection(event.target.files[0], fileName);
                            });
                        file_input.assign(scope, event.target.files[0]);

                        /*scope.$apply(function() {
                            FileReader.ReadAsDataUrl(event.target.files[0], scope)
                                .then(function(f) {
                                    afterSelection(event.target.files[0], fileName);
                                });
                            file_input.assign(scope, event.target.files[0]);
                        });*/
                    }
                    else {
                        scope.$apply(function() {
                            scope.invalidExtension = true;
                            var input;
                            event.target.files[0] = null;
                            el.find('input').replaceWith(input = el.find('input').clone(true));
                            if (!scope.model.xp) scope.model.xp = {};
                            scope.model.xp[scope.keyname] = null;
                        });
                    }
                    break;
            }
        }

        element.bind('change', updateModel);
    }

    return directive;
}

function rsmFileUploader($sce, WeirService, $q, FileReader, FilesService, OrderCloudSDK) {
    //This file uploader operates after the quote is submitted. We need the quote number to identify the files in S3.
    // this directive is used because i cannot find any other way to get access to the form element.
    // the ordercloud file upload operates on the change event. I want this directive to have a means to operate when
    // the other controller (parent item) wants it to kick off.

    //model in this case is the quote number. I need to get that into here once the quoted is created by the OC,
        // do a vm.quoteID = quote.ID <-- return from the OC SDK.
        // control is the button click from the parent controller.
        // keyname is xp property name: Files or PODocument.
    var directive = {
        scope: {
            control: '='
        },
        restrict: 'E',
        templateUrl: 'common/files/templates/rsm.files.tpl.html',
        replace: true,
        link: link
    };

    function link(scope, element, attrs) {
        var allFileNames = [];
        scope.internalControl = scope.control || {}; //rsmFileUploader in my parent control.
        scope.internalControl.UploadFiles = function(OrderID) { //Called from the controller that uses this directive.
            // I can expose what i need to the parent controller here.
            var queue = [];
            var deferred = $q.defer();
            if(!scope.uploader.files) {
                deferred.resolve();
                return deferred.promise;
            }

            // populate the queue with the FileReader and FileService calls
            Object.keys(scope.uploader.files).forEach(function(key) {
                allFileNames.push(scope.uploader.files[key].name); //use this to patch the order with the file names.
                queue.push(
                    FileReader.ReadAsDataUrl(scope.uploader.files[key], scope)
                        .then(function(f) {
                            FilesService.Upload(scope.uploader.files[key], OrderID + scope.uploader.files[key].name); //taken from afterSelection.
                        })
                );
            });

            //upload the files to S3.
            $q.all(queue)
                .then(function(results) {
                    scope.uploader.files = null; //This doesn't work, need to use jquery and set the value = "";
                    //Patch the order with the file names.
                    var xp = {
                        "xp": {
                            "Files": allFileNames
                        }
                    };
                    return OrderCloudSDK.Orders.Patch("Outgoing", OrderID, xp);
                })
                .then(function(Order) {
                    deferred.resolve(Order);
                })
                .catch(function(ex) {
                    console.log(ex);
                    deferred.reject(ex);
                });

            return deferred.promise;
        };

        var labels = {
            en: {
                SelectFiles: "Select files to upload",
                Invalid: "Invalid File Type"
            },
            fr: {
                SelectFiles: $sce.trustAsHtml("Sélectionner le fichier à importer"),
                Invalid: $sce.trustAsHtml("Type de fichier invalide")
            }
        };
        scope.labels = WeirService.LocaleResources(labels);

        // this is the only way I have seen to get the form element for an angular change event.
        // there is a listener on the entire rsm.files.upload div, and this looks to see if the html tag
        // <input type="file" name="upload"> was the cause of the change. If so, then we have the dom element.
        // in this case we populate the internal control with the files, and wait for the parent controller to initate
        // the upload.
        function updateModel(event) {
            switch (event.target.name) {
                case 'upload':
                    //attach the file names to the internal control so the enquiry has the names for submission.
                    //add the event.target to the scope so i can clear it after the file upload.
                    scope.uploader = event.target;
                    break;
            }
        }

        // This attaches a jquery lite onchange listener to the entire div in rsm.files.tpl.html
        element.bind('change', updateModel);
    }

    return directive;
}