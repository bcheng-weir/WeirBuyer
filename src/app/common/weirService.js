angular.module( 'orderCloud' )
    .factory( 'WeirService', WeirService )
;

function WeirService( $q, $cookieStore, $sce, OrderCloud, CurrentOrder ) {
    var orderStatuses = {
	    Draft: {id: "DR", label: "Draft", desc: "This is the current quote under construction"},
	    Saved: {id: "SV", label: "Saved", desc: "Quote has been saved but not yet shared"},
	    Shared: {id: "SH", label: "Shared", desc: "Shopper quote has been shared with a buyer"},
	    Approved: {id: "AP", label: "Approved", desc: "Shopper quote has been shared with a buyer and approved"},
            Rejected: {id: "RJ", label: "Rejected", desc: "Shopper quote has been shared with a buyer and then rejected"},
            Submitted: {id: "SB", label: "Submitted", desc: "Quote has been submitted to Weir"},
            ConfirmedPending: {id: "CP", label: "Confirmed pending PO", desc: "Order has been submitted and confirmed by Weir, pending addition of PO number"},
            Review: {id: "RV", label: "Under review", desc: "Order has been submitted to Weir, but a change or additional information is needed"},
            Confirmed: {id: "CF", label: "Confirmed", desc: "Order has been submitted to and confirmed by Weir, and PO number is attached"},
            Cancelled: {id: "CX", label: "Cancelled", desc: "Order cancelled after submission"}
    };
    var orderStatusList = [
	    orderStatuses.Draft, orderStatuses.Saved, orderStatuses.Shared, orderStatuses.Approved, orderStatuses.Rejected,
	    orderStatuses.Submitted, orderStatuses.ConfirmedPending, orderStatuses.Review, orderStatuses.Confirmed, orderStatuses.Cancelled
    ];
    function getStatus(id) {
	var match = null;
        angular.forEach(orderStatusList, function(status) {
            if (status.id == id) {
		    match = status;
		    return;
	    }
        });
	return match;
    }

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
	SearchType: { Serial: "s", Part: "p", Tag: "t"},
	GetWeirGroup: getWeirGroup,
	SetWeirGroup: setWeirGroup,
	OrderStatus: orderStatuses,
	OrderStatusList: orderStatusList,
	LookupStatus: getStatus,
	FindQuotes: findQuotes,
	CartHasItems: cartHasItems,
	UpdateQuote: updateQuote,
        SetQuoteAsCurrentOrder: setQuoteAsCurrentOrder,
	FindCart: findCart
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

	CurrentOrder.GetCurrentCustomer()
	.then(function(cust) {
	    if (cust) {
                OrderCloud.Categories.List(null, 1, 50, null, null, {"xp.SN": serialNumber, "ParentID": cust.id})
                .then(function(matches) {
		    if (matches.Items.length == 1) {
                       	    result = matches.Items[0];
                	    getParts(result.ID, deferred, result);
		    } else if (matches.Items.length == 0) {
			    throw { message: "No matches found for serial number " + serialNumber};
		    } else {
			    throw { message: "Data error: Serial number " + serialNumber + " is not unique"};
		    }
                });
	    } else {
                 throw { message: "Customer for search not set"};
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

	CurrentOrder.GetCurrentCustomer()
	.then(function(cust) {
	    if (cust) {
                OrderCloud.Categories.List(null, 1, 50, null, null, {"xp.TagNumber": tagNumber, "ParentID": cust.id})
                .then(function(matches) {
		    if (matches.Items.length == 1) {
                       	result = matches.Items[0];
                	getParts(result.ID, deferred, result);
		    } else if (matches.Items.length == 0) {
			throw { message: "No matches found for tag number " + tagNumber};
		    } else {
			throw { message: "Data error: Tag number " + tagNumber + " is not unique"};
		    }
                });
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
	CurrentOrder.GetCurrentCustomer()
	.then(function(cust) {
	    if (cust) {
                angular.forEach(serialNumbers, function(number) {
                    if (number) {
            	        queue.push((function() {
                	    var d = $q.defer();
                	    OrderCloud.Categories.List(null, 1, 50, null, null, {"xp.SN": number, "ParentID": cust.id})
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
	     }
        })
	.catch(function(ex) {
            d.resolve();
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
	CurrentOrder.GetCurrentCustomer()
	.then(function(cust) {
	    if (cust) {
                angular.forEach(tagNumbers, function(number) {
                    if (number) {
            	        queue.push((function() {
                	    var d = $q.defer();
                	    OrderCloud.Categories.List(null, 1, 50, null, null, {"xp.TagNumber": number, "ParentID": cust.id})
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
	    }
        })
	.catch(function(ex) {});

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
				if (products.Items.length == 0) {
                                    results.Parts.push({Number: number, Detail: null});
				} else {
			            angular.forEach(products.Items, function(product) {
			               var result = {Number: number, Detail: product};
                                       results.Parts.push(result);
			            });
				}
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
		    if (result.Detail) {
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
		    }
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

    // Category representing the weir group of the buyer
    var weirGroup = {};
    function setWeirGroup(group) {
        weirGroup = group;
    }
    function getWeirGroup() {
	    // TODO: Remove this
	    if (!weirGroup.ID) {
		weirGroup = {
                    "ID": "WCVUK",
                    "Name": "Weir Controls and Valves UK",
                    "Description": null,
                    "ListOrder": 1,
                    "Active": true,
                    "ParentID": null
                  };
	    }
        return weirGroup;
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

   // Resolve user
	var users = {};
	function getUser(userId) {
            var deferred = $q.defer();
		if (users[userId]) {
		    deferred.resolve(users[userId]);
		} else {
		    OrderCloud.Users.Get(userId)
			.then(function(usr) {
				users[userId] = usr;
				deferred.resolve(usr);
			})
			.catch(function(ex) {
				deferred.resolve({});
			});
		}
		return deferred.promise;
	}

   // Resolve customer
	var customers = {};
	function getCustomerCategory(orgId) {
            var deferred = $q.defer();
		if (customers[orgId]) {
		    deferred.resolve(customers[orgId]);
		} else {
			OrderCloud.Categories.Get(orgId)
			.then(function(org) {
				customers[orgId] = org;
				deferred.resolve(org);
			})
			.catch(function(ex) {
				deferred.resolve({});
			});
		}
		return deferred.promise;
	}

	function cartHasItems() {
	    return true;
	}

    function findCart(customer) {
        var deferred = $q.defer();
        OrderCloud.Me.Get()
        .then(function(user) {
            var filter = {
               "FromUserId": user.ID,
               "xp.Type": "Quote",
               "xp.CustomerID": customer.id,
               "xp.Status": "DR"
           };
           OrderCloud.Me.ListOutgoingOrders(null, 1, 50, null, null, filter)
           .then(function(results) {
               if (results.Items.length > 0) {
                   var ct = results.Items[0];
                   CurrentOrder.Set(ct.ID);
                   deferred.resolve(ct);
               } else {
                   var cart = {
                       "Type": "Standard",
                       xp: {
                           "Type": "Quote",
                           "CustomerID": customer.id,
                           "CustomerName": customer.name,
                           "Status": "DR"
                       }
                   }
                   OrderCloud.Orders.Create(cart)
                   .then(function(ct) {
                        CurrentOrder.Set(ct.ID);
                       deferred.resolve(ct);
                   })
                   .catch(function(ex) {
                       deferred.reject(ex);
                   })
               }
           });
       })
       .catch(function(ex) {
           d.reject(ex);
        });
	return deferred.promise;
    }

    function findQuotes(statuses, resolveSharedId) {
	    var quotes = [];
            var queue = [];
            var deferred = $q.defer();

	    if (statuses && statuses.length) {
	        var filter = {
	    	    "xp.Type": "Quote"
	        };
		var statusFilter = statuses[0].id;
		for(var i=1; i<statuses.length; i++) statusFilter += "|" + statuses[i].id;
                filter["xp.Status"] = statusFilter;

                var d = $q.defer();
                OrderCloud.Me.ListOutgoingOrders(null, 1, 50, null, null, filter)
                    .then(function(results) {
                        angular.forEach(results.Items, function(quote) {
                            quotes.push(quote);
                        });
                        d.resolve();
                    })
                    .catch(function(ex) {
                        d.resolve();
                    });

            d.promise.then(function() {
                // resolveCustomers(quotes).then( function() {
		        resolveUsers(quotes, resolveSharedId).then(function() {
                                deferred.resolve(quotes);
	                });
	        // });
	    });
        } else {
             deferred.resolve(quotes);
        }
	return deferred.promise;
    }

    function resolveUsers(quotes, resolveSharedId) {
        var deferred = $q.defer();
        if (resolveSharedId) {
            var userIds = [];
            angular.forEach(quotes, function(quote) {
                if (quote.xp.SharedWithID && userIds.indexOf(quote.xp.SharedWithID) < 0) userIds.push(quote.xp.SharedWithID);
            });
            var queue2 = [];
            angular.forEach(userIds, function(id) {
                queue2.push((function() {
                    var d = $q.defer();
                    getUser(id)
	                .then(function(usr) { d.resolve(); })
	                .catch(function(ex) { d.resolve(); });
                    return d.promise;
                })());
            });
            $q.all(queue2).then(function() {
                angular.forEach(quotes, function(quote) {
                    if (quote.xp.SharedWithID) {
                        var usr = users[quote.xp.SharedWithID];
                        if (usr) {
                            quote.tmp = quote.tmp || {};
                            quote.tmp.user = usr;
                        }
                    }
                });
                deferred.resolve(quotes);
             });
         } else {
             deferred.resolve(quotes);
         }
	return deferred.promise;
    }

    function resolveCustomers(quotes) {
        var deferred = $q.defer();
        var orgIds = [];
        angular.forEach(quotes, function(quote) {
            if (quote.xp.CustomerID && orgIds.indexOf(quote.xp.CustomerID) < 0) orgIds.push(quote.xp.CustomerID);
        });
	var queue = [];
	angular.forEach(orgIds, function(id) {
	    queue.push((function() {
	        var d = $q.defer();
	        getCustomerCategory(id).then(
	            function(org) { d.resolve(); }
	        ).catch(function(ex) { d.resolve(); });
	            return d.promise;
	    })());
	});
        $q.all(queue).then(function() {
            angular.forEach(quotes, function(quote) {
                if (quote.xp.CustomerID) {
                    var org = customers[quote.xp.CustomerID];
                    if (org) {
                        quote.tmp = quote.tmp || {};
                        quote.tmp.Customer = org;
                    }
                }
            });
            deferred.resolve(quotes);
	});
	return deferred.promise;
    }

    function updateQuote(quoteId, data) {
        var deferred = $q.defer();
	OrderCloud.Orders.Patch(quoteId, data)
		.then(function(quote) { deferred.resolve(quote)})
	        .catch(function(ex) { d.deferred.reject(ex); });
	return deferred.promise;
    }
    function setQuoteAsCurrentOrder(quoteId) {
        var deferred = $q.defer();
	CurrentOrder.Set(quoteId)
	    .then(function() {
	        CurrentOrder.Get()
		    .then(function(quote) {
	                CurrentOrder.SetCurrentCustomer({
	                    id: quote.xp.CustomerID,
			    name: quote.xp.CustomerName
		        })
			.then(function() {
		            deferred.resolve();
			});
	            });
	    })
  	    .catch(function(ex) { d.deferred.reject(ex); });
	return deferred.promise;
    }

    return service;
}
