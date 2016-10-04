angular.module( 'orderCloud' )
    .factory( 'WeirService', WeirService )
;

function WeirService( $q, $cookieStore, OrderCloud, CurrentOrder ) {
    var service = {
        SerialNumber: serialNumber,
        SerialNumbers: serialNumbers,
        PartNumbers: partNumbers,
        TagNumber: tagNumber,
        TagNumbers: tagNumbers,
        AddPartToQuote: addPartToQuote,
        AddPartsToQuote: addPartsToQuote,
        QuickQuote: quickQuote,
        Locale: getLocale,
        LocaleResources: selectLocaleResources,
        navBarLabels: navlabels,
	SetLastSearchType: setLastSearchType,
	GetLastSearchType: getLastSearchType,
	SearchType: { Serial: "s", Part: "p", Tag: "t"}
    };
    function getLocale() {
        var localeOfUser = $cookieStore.get('language');
        if(localeOfUser == null || localeOfUser == false){
            //set the expiration date of the cookie.
            var now = new Date();
            var exp = new Date(now.getFullYear(), now.getMonth()+6, now.getDate());
            //getting the language of the user's browser
            localeOfUser = navigator.language;
            localeOfUser = localeOfUser.substr(0,2);
            //setting the cookie.
            $cookieStore.put('language', localeOfUser, {
                expires: exp
            });

        }
	    return localeOfUser;
    }
    function navlabels(){
        var navLabels = {
            en: {
                privacyTitle: "Privacy Statement",
                cookieTitle: "Cookie Policy",
                termsTitle: "Terms of Use",
                contactTitle: "Contact",
                language: true
            },
            fr: {
                privacyTitle: "Déclaration de confidentialité",
                cookieTitle: "Politique de Cookie",
                termsTitle: "Conditions d'utilisation",
                contactTitle: "Contact",
                language: false
            }
        };
        return navLabels;
    };

    function selectLocaleResources(resource) {
	    var tmp = resource[getLocale()];
	    return (tmp) ? tmp : resource["en"];
    }

    function serialNumber(serialNumber) {
        var deferred = $q.defer();
        var result;

        OrderCloud.Categories.List(null, 1, 50, null, null, {"xp.SN": serialNumber})
            .then(function(matches) {
		if (matches.Items.length == 1) {
                       	result = matches.Items[0];
                	getParts(result.ID, deferred, result);
		} else if (matches.Items.length == 0) {
			throw { message: "No matches found for serial number " + serialNumber};
		} else {
			throw { message: "Data error: Serial number " + serialNumber + " is not unique"};
		}
            })
            .catch(function(ex) {
               	deferred.reject(ex);
            });

        return deferred.promise;
    }
    function tagNumber(tagNumber) {
        var deferred = $q.defer();
        var result;

        OrderCloud.Categories.List(null, 1, 50, null, null, {"xp.TagNumber": tagNumber})
            .then(function(matches) {
		if (matches.Items.length == 1) {
                       	result = matches.Items[0];
                	getParts(result.ID, deferred, result);
		} else if (matches.Items.length == 0) {
			throw { message: "No matches found for tag number " + tagNumber};
		} else {
			throw { message: "Data error: Tag number " + tagNumber + " is not unique"};
		}
            })
            .catch(function(ex) {
               	deferred.reject(ex);
            });

        return deferred.promise;
    }
    function getParts(catId, deferred, result) {
        OrderCloud.Me.ListProducts(null, 1, 100, null, null, null, catId)
            .then(function(products) {
                result.Parts = [];
                angular.forEach(products.Items, function(product) {
                    result.Parts.push({Number: product.ID, Detail: product});
                });
                deferred.resolve(result);
            })
            .catch(function(ex) {
                deferred.reject(ex);
            })
    }

    function serialNumbers(serialNumbers) {
        var deferred = $q.defer();

        var results = [];
        var queue = [];
        angular.forEach(serialNumbers, function(number) {
            if (number) {
            	queue.push((function() {
                	var d = $q.defer();
                	OrderCloud.Categories.List(null, 1, 50, null, null, {"xp.SN": number})
                    	.then(function(matches) {
				if (matches.Items.length == 1) {
                        		results.push({Number: number, Detail: matches.Items[0]});
				} else {
                                	results.push({Number: number, Detail: null});
				}
                        	d.resolve();
                    	})
                    	.catch(function(ex) {
                        	results.push({Number: number, Detail: null});
                        	d.resolve();
                    	});

                	return d.promise;
            	})());
	    }
        });

        $q.all(queue).then(function() {
            deferred.resolve(results);
        });
        return deferred.promise;
    }
    function tagNumbers(tagNumbers) {
        var deferred = $q.defer();

        var results = [];
        var queue = [];
        angular.forEach(tagNumbers, function(number) {
            if (number) {
            	queue.push((function() {
                	var d = $q.defer();
                	OrderCloud.Categories.List(null, 1, 50, null, null, {"xp.TagNumber": number})
                    	.then(function(matches) {
				if (matches.Items.length == 1) {
                        		results.push({Number: number, Detail: matches.Items[0]});
				} else {
                                	results.push({Number: number, Detail: null});
				}
                        	d.resolve();
                    	})
                    	.catch(function(ex) {
                        	results.push({Number: number, Detail: null});
                        	d.resolve();
                    	});

                	return d.promise;
            	})());
	    }
        });

        $q.all(queue).then(function() {
            deferred.resolve(results);
        });
        return deferred.promise;
    }

    function partNumbers(partNumbers) {

        var results = {
		Parts: [],
		Customer: ""
	};
	var categories = [];
        var queue = [];
	var q2 = [];
	var q3 = [];
        var deferred = $q.defer();

  	getParts(partNumbers);
        $q.all(queue)
	    .then(function() {
	        getValvesForParts(results);
	        $q.all(q2)
		     .then(function() {
	                 getCustomerForValves(categories);
	                 $q.all(q3)
			     .then(function() {
	                         deferred.resolve(results);
	                     });
	              });
                })
		    .catch (function(ex) {
			deferred.resolve(results);
		     });
	return deferred.promise;

	function getParts(partNumbers) {
            angular.forEach(partNumbers, function(number) {
	        if (number) {
                    queue.push((function() {
                        var d = $q.defer();
    
                        OrderCloud.Me.ListProducts(null, 1, 50, null, null, {"Name": number})
                            .then(function(products) {
			        angular.forEach(products.Items, function(product) {
			           var result = {Number: number, Detail: product};
                                   results.Parts.push(result);
			        });
                                d.resolve();
                            })
                            .catch(function(ex) {
                                results.Parts.push({Number: number, Detail: null});
                                d.resolve();
                            });
                        return d.promise;
                    })());
	        }
            });
	}

	function getValvesForParts(results) {
	    angular.forEach(results.Parts, function(result) {
		    q2.push((function() {
		        var d2 = $q.defer();
		        var part = result.Detail;
		        OrderCloud.Categories.ListProductAssignments(null, part.ID, 1, 50)
		            .then(function(valveIds) {
			         angular.forEach(valveIds.Items, function(entry) {
				     if (categories.indexOf(entry) < 0) categories.push(entry);
			         });
			         d2.resolve();
			    })
		        .catch (function(ex) {
			        d2.resolve();
		        });
			return d2.promise;
		    })());
	    });
	}

	function getCustomerForValves(valves) {
	    var def3 = $q.defer();
	    angular.forEach(valves, function(entry) {
		q3.push((function() {
		    var d3 = $q.defer();
		    OrderCloud.Categories.Get(entry.CategoryID)
		         .then(function(item) {
			     if (!results.Customer) {
				  results.Customer = item.xp.Customer;
			     } else if (results.Customer != item.xp.Customer) {
				results.Customer = "*";
			     }
			     d3.resolve();
		          })
			  .catch(function(ex) {
			      d3.resolve();
			   });
			   return d3.promise;
		        })());
	    });
	}
    }

    var lastSearchType = "";
    function setLastSearchType(type) {
        lastSearchType = type;
    }
    function getLastSearchType() {
        return lastSearchType;
    }

    function addPartToQuote(part) {
        var deferred = $q.defer();

        CurrentOrder.Get()
            .then(function(order) {
                addLineItem(order);
            })
            .catch(function() {
                OrderCloud.Orders.Create({ID: randomQuoteID()})
                    .then(function(order) {
                        CurrentOrder.Set(order.ID);
                        addLineItem(order);
                    })
            });

        function addLineItem(order) {
            var li = {
                ProductID: part.Detail.ID,
                Quantity: part.Quantity
            };

            OrderCloud.LineItems.Create(order.ID, li)
                .then(function(lineItem) {
                    deferred.resolve({Order: order, LineItem: lineItem});
                });
        }

        return deferred.promise;
    }

    function addPartsToQuote(parts) {
        var deferred = $q.defer();

        CurrentOrder.Get()
            .then(function(order) {
                addLineItems(order);
            })
            .catch(function() {
                OrderCloud.Orders.Create({ID: randomQuoteID()})
                    .then(function(order) {
                        CurrentOrder.Set(order.ID);
                        addLineItems(order);
                    });
            });

        function addLineItems(order) {
            var queue = [];

            angular.forEach(parts, function(part) {
                if (part.Quantity) {
                    queue.push((function() {
                        var d = $q.defer();

                        var li = {
                            ProductID: part.Detail.ID,
                            Quantity: part.Quantity
                        };

                        OrderCloud.LineItems.Create(order.ID, li)
                            .then(function(lineItem) {
                                d.resolve(lineItem);
                            });

                        return d.promise;
                    })());
                }
            });

            $q.all(queue).then(function() {
                deferred.resolve();
            });
        }

        return deferred.promise;
    }

    function quickQuote(parts) {
        var deferred = $q.defer();

        CurrentOrder.Get()
            .then(function(order) {
                addLineItems(order);
            })
            .catch(function() {
                OrderCloud.Orders.Create({ID: randomQuoteID()})
                    .then(function(order) {
                        CurrentOrder.Set(order.ID);
                        addLineItems(order);
                    });
            });

        function addLineItems(order) {
            var queue = [];

            angular.forEach(parts, function(part) {
                if (part.Number && part.Quantity) {
                    queue.push((function() {
                        var d = $q.defer();

                        var li = {
                            ProductID: part.Number,
                            Quantity: part.Quantity
                        };

                        OrderCloud.LineItems.Create(order.ID, li)
                            .then(function(lineItem) {
                                d.resolve(lineItem);
                            });

                        return d.promise;
                    })());
                }
            });

            $q.all(queue).then(function() {
                deferred.resolve();
            });
        }

        return deferred.promise;
    }

    function randomQuoteID() {
        var id = "";
        var possible = "0123456789";

        for( var i=0; i < 10; i++ )
            id += possible.charAt(Math.floor(Math.random() * possible.length));

        return id;
    }

    return service;
}
