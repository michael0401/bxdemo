/* ===================================================
 * db.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global _: true, Boxspring: true, Backbone: true */

if (typeof _ === 'undefined') {
	if (typeof exports !== 'undefined') {
		_ = require('underscore');
	} else if (typeof _ === 'undefined') {
		throw new Error('Boxspring.js requires Underscore.js');
	}
}

if (typeof Boxspring === 'undefined') {
	Boxspring = {};	
}

(function(global) {
	"use strict";
	
	var db = function (options) {
		var that = _.extend({}, _.hash(options), this);
				
		// allow either 'name' or {options} but not both arguments
		if (_.isString(options)) {
			options = { 'db_name': options };
		} else if (!options) {
			options = {};
		}
		
		var queryHTTP = function (options, callback) {
			var local = this;
			this.HTTP({
				'path': ((options && options.url) || '') + _.formatQuery((options && options.query) || {}),
				'method': ((options && options.method) || 'GET'),
				'body': ((options && options.body) || {}),
				'auth': (options && options.auth) || this.auth,
				'headers': ((options && options.headers) || this.headers.post())
			}, function (err, res) {
				if ((callback && typeof callback) === 'function') {
					callback.call(local, err, res);
				}
			});
		};
		that.queryHTTP = queryHTTP;
		
		var heartbeat = function (handler) {	
			this.queryHTTP({ 'url': '' }, handler);
			return this;
		};
		that.heartbeat = heartbeat;
		
		var session = function (handler) {
			this.queryHTTP({'url': '/_session'}, handler);
			return this;
		};
		that.session = session;

		var all_dbs = function (handler) {
			this.queryHTTP({'url': '/_all_dbs'}, handler);
			return this;
		};
		that.all_dbs = all_dbs;
		
		var uuids = function(count, handler) {
			if (_.isFunction(count)) {
				handler = count;
				count = 1;
			}
			this.queryHTTP({
				'url': '/_uuids',
				'query': { 'count': count }}, handler);
			return this;
		};
		that.uuids = uuids;
		
		// What it does: attempts to login the user to this database. 
		var login = function (handler, encode) {
			var local = this;
			
			this.queryHTTP({
				'url': '/_session',
				'method': 'POST',
				'headers': { 'Content-Type': 'application/x-www-form-urlencoded' },
				'body': _.formatQuery(this.auth).slice(1) }, function(err, response) {
					if (err) {
						return handler(err, response);
					}
					local.session(handler);
				});
		};
		that.login = login;
		
		var logout = function(handler) {
			this.queryHTTP({
				'url': '/_session',
				'method': 'DELETE'
			}, handler);
			return this;
		};
		that.logout = logout;
		
		// replicate the source database to the target; arguments are Boxspring.js database
		// document objects
		var replicate = function(source, target) {
			var doc = this.doc('_replicate')
			, sourceURL = _.urlParse(source.url())
			, sourceAuth = this.get('auth').name + ':' + source.get('auth').password
			, targetURL = _.urlParse(target.url())
			, targetAuth = target.get('auth').name + ':' + target.get('auth').password
			
			doc.set('_method', 'POST');
			console.log(_.urlFormat(_.extend(_.urlParse(this.urlRoot), { 
				'auth': sourceAuth,
				'path': this.url() })));
		};
		that.replicate = replicate;
		return that;
	};

	global.createdb = function(options) {
		var object = db.call(this, options)
		, use = function (urlRoot) {
			var new_db = _.extend({
				// expose these to the interface of this object
				'db_name': this.get('db_name'),
				'maker': this.get('maker'),
				'_design': this.get('_design') || '_design/default',
				'_view': this.get('_view') || '_view/default',
				'_update': this.get('_update') || '_update/default',
				'auth': this.get('auth') || {'name': '', 'password': ''},
				// if app does not supply a urlRoot, or doesn't provie a protocol, use localhost;
				'urlRoot': (!urlRoot || urlRoot === '127.0.0.1' || urlRoot === 'localhost') 
					? 'http://localhost:5984'
					: urlRoot
			}, object);
			
			
						
			// be forgiving, prepend the reserved words _design, _view, _update if needed
			['_design', '_view', '_update'].forEach(function(option) {
				if (new_db[option] && new_db[option].indexOf(option) === -1) {
					new_db[option] = [ option, new_db[option] ].join('/');
				}
			});
			// all subsequent HTTP calls will use the supplied credentials.
			new_db.HTTP = _.server('server', 
				_.urlParse([new_db.urlRoot, new_db.db_name].join('/')), this.get('auth')).get;
			return new_db.doc();
		};
		object.use = use;
		return object;
	};
}(Boxspring));
/* ===================================================
 * db.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global _: true, Boxspring: true, Backbone: true */
"use strict";

(function(global) {
	
	var users = function (name) {		
		var that = _.extend({}, this)
		, userdb = this.createdb().set({'db_name': '_users', 'auth': this.auth }).use(this.urlRoot);
			
		// used by userSignUp and userDelete
		var authFileUserDocName = function() {
			return 'org.couchdb.user:'+name;
		};

		var fetch = function (handler) {
			var doc = userdb.doc(authFileUserDocName()).retrieve(function(err, response) {
				handler(err, response, doc);
			});
		};
		that.fetch = fetch;
		
		var list = function (handler) {
			var doc = userdb.doc(authFileUserDocName()).retrieve(function(err, response) {
				handler(err, response, doc);
			});
		};
		that.list = list;
				
		var signUp = function(password, roles, handler) {
			var anonymous = this.set({'db_name': '_users', 'auth': {'name': '', 'password': ''}}).use(this.urlRoot)
			, newUser = this.set('auth', {'name': name, 'password': password }).use(this.urlRoot);

			// create a document and add it to the _users database
			anonymous.doc(authFileUserDocName()).source({
				'type': 'user',
				'name': name,
				'password': password,
				'roles': roles
			}).save(function(err, r2) {
				if (err) {
					// something is wrong, return an error
					return handler(err, r2);
				}
				// log in this new user and provide a new database handle in the callback
				newUser.login(function(err, response) {
					handler(err, response, newUser);
				});
			});				
		};
		that.signUp = signUp;
		
		var remove = function (handler) {
			userdb
				.doc(authFileUserDocName())
				.remove(handler);
		};
		that.remove = remove;
		
		var update = function(newPassword, newRoles, handler) {			
			this.fetch(function(err, response, doc) {
				if (err) {
					return handler(err, response);
				}
				// update the document.
				doc.source({
					'type': 'user',
					'name': name,
					'password': newPassword,
					'roles': newRoles
				}).update(handler);
			});
		};
		that.update = update;
		return that;
	};
	
	global.users = users;
}(Boxspring));
/* ===================================================
 * doc.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global _: true, Boxspring: true */

(function(global) {
	"use strict";
	
	var reserved = {
		'_attachment': true,	// creates a document with a special _attachment property
		'_bulk_docs': true, 	// body has no _id on save; 
		'_users': true,			// the special _users database; id is empty, body has no _id
		'_design': true,		// _design/name; _design/designName
		'_update': true,		// _design/name/_update/updateName; 
		'_view': true			// _design/name/_view/viewName
	};

	var doc = function(id) {
		// inherit from the caller object, always a db object
		var that = _.extend({}, this)

		// split off reserved document ids
		, idRoot = id && id.split('/')[0] || ''	

		// give this doc its own hash
		that = _.extend(that, _.hash());
		
		// expose the default headers and options for this doc object
		that.headers = _.hash({ 
			'X-Couch-Full-Commit': true, 
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		});
		that.options = _.hash();

		var url = function (_url) {
			if (_url) {
				this.set('_url', _url);
			}
			return this.get('_url');
		};
		that.url = url;
		
		// configure the url for this resource; 
		if (!id) {
			// if called without an id, then this is a database document
			that.url('/' + this.db_name);
		} else 	if (idRoot !== '_design' && idRoot !== '_view' && idRoot !== '_update') {
			that.url(((this && this.url && this.url())) || [this.db_name, id].join('/'));
		} 
		
		// set an _id attribute for non-reserved doc types
		if (id && idRoot.charAt(0) !== '_') {
			that.set('_id', id);
			that.url([ that.url(), id ].join('/'));				
		}  
		// these special docs extend the database
		else if (_.found(['_all_docs', '_bulk_docs', '_replicate'], idRoot)) {
			that.url('/' + [ this.db_name, idRoot].join('/'));
		}
		
		// Purpose: takes an object and updates the state of the document hash
		var source = function (docinfo) {
			var local = this;
			if (docinfo) {
				_.each(docinfo, function(item, key) {
					local.set(key, item);
				});		
			}
			return this;
		};
		that.docinfo = source;
		that.source = source;
		
		// Purpose: internal function to keep document attributes up-to-date
		var sync = function (handler) {
			var local = this;
			
			return function(err, response) {
				// if a doc, then update all fields
				if (!err) {
					local.source(response.body);
				}
				return handler.call(local, err, response);
			};
		};
		
		var exists = function () {
			return (this.contains('_rev'));
		};
		that.exists = exists;

		// Purpose: Method for saving to the database
		var save = function (handler) {	
			var body = _.omit(this.post(), '_url', '_method');			
			this.queryHTTP({
					'url': this.url(),
					'method': this.get('_method') || 'PUT',
					'headers': this.headers.post(),
					'query': this.options.post(),
					'body': body }, sync.call(this, handler));
			return this;
		};
		that.save = save;
		that.create = save;
		
		var all_docs = function (handler) {
			var local = this;
			
			this.doc('_all_docs').read(function(err, response) {
				if (err) {
					handler(err, response);
				} else {
					handler(err, local.rows(response));
				}
			});
			return this;
		};
		that.all_docs = all_docs;

		var db_info = function (handler) {
			this.doc().read(handler);
			return this;
		};
		that.db_info = db_info;

		var retrieve = function (handler) {				
			this.queryHTTP({
				'url': this.url(),
				'headers': this.headers.post(),
				'query': this.options.post() 
				}, sync.call(this, handler));
			return this;
		};
		that.retrieve = retrieve;
		that.read = retrieve;
		
		// Purpose: helper to get the 'rev' code from header. used by doc and bulk requests
		var getRev = function (o) {				
			if (o && o.header && o.header.etag) {
				return o.header.etag.replace(/\"/g, '').replace(/\r/g,'');
			}
		};
		that.getRev = getRev;
		
		var head = function (handler) {
			var local = this;

			this.queryHTTP({
					'url': this.url(),
					'method': 'HEAD',
					'headers': this.headers.post()
				}, function (err, response) {
					if (err) {
						return handler(err, response);
					}
					local.set('_rev', local.getRev(response));
					if (handler && typeof handler === 'function') {
						handler.call(local, err, response);						
					}
				});
			return this;
		};
		that.head = head;

		// if data is provided, add it to the current document over-writing 
		// existing key-values; otherwise just save the current state of the doc in memory
		var update = function (handler, data) {
			var local = this;
						
			// cache the data since read will over-write with stale content from the server;
			if (!data) {
				data = _.clone(this.post());
			}
			
			this.read(function(err, response) {
				// when updating, we might get an error if the doc doesn't exist
				if (!err || response.code === 404) {
					// now add back data to update from above and save
					return local.source(data).save(handler);	
				}
				handler.call(local, err, response);
			});
			return this;
		};
		that.update = update;

		var remove = function (handler) {
			var local = this;
						
			// remove differs depending on whether its a 'db' or 'doc'
			if (!id) {
				// its a 'db'
				this.headers.set('content-type','application/x-www-form-urlencoded');
				this.queryHTTP({
						'url': this.url(),
						'method': 'DELETE', 
						'headers': this.headers.post() }, handler);
			} else {
				// its a 'doc'
				this.head(function(err, response) {
					if (!err) {
						local.options.set('rev', local.get('_rev'));
						return local.queryHTTP({
							'url': local.url(),
							'method': 'DELETE',
							'query': local.options.post() }, handler);		
					}
					handler.call(this, err, response);		
				});
			}
			return this;
		};
		that.remove = remove;
		that.delete = remove;
		
		/*
		if (attachment) {
			try {
				// _attachment is a special field in the document. Must be base 64 encoded.
				doc._attachments = {
					"html": {
						"content_type":"text\/plain",
						'data': _.encode(attachment.replace(/\n/g, '').replace(/\r/g, ''))					
					}
				}				
			} catch (e) {
				console.log('Base64 encoding error - ', e)
			}
		}
		*/
		var attachment = function(name, value, type) {
			var coded = (!_.isFunction(value)) && _.encode(_.filterCharCodes(value))
			, handler = value
			, attach = {
				'_attachments': {}
			}
			, types = {
				"html": {
					"content_type":"text\/plain",
					'data': coded 					
				},
				"xml": {
					"content_type":"text\/plain",
					'data': coded					
				}				
			};
			
			if (!_.isFunction(value)) {
				if (types.hasOwnProperty(type)) {
					attach._attachments[name] = types[type]; 
				} else {
					attach._attachments[name] = types['xml']; 				
				}			
				this.set('_attachments', attach._attachments);				
				return this;
			}
			// read an attachment by appending its name to the path after the docId
			this.doc(name).read(handler);
//			this.doc('/' + name).read(handler);
			return this;			
		};
		that.attachment = attachment;
		
		var info = function (handler) {
			// set the 'revs_info' flag to true on retrieve;
			this.options.set('revs_info', true);
			this.read(handler);
			return this;
		};
		that.info = info;
		
		// drop-in replacement for Backbone.sync. 
		// Used by Boxspring.Doc Model 
		// Delegates to Backbones success and error handling for ajax.
		var backboneSync = function (method, attributes, options) {
			var model = this;
						
			this._doc.source(_.omit(attributes, '_doc'))
				[method].call(this._doc, function(err, response) {
					if (err) {
						return options.error.call(model, model, response.body);
					}
					options.success.call(model, response.body, response.status, response.jqXHR);					
			});
		};
		that.sync = backboneSync;
		return that;		
	};
	global.doc = doc;

}(Boxspring));


/*

var pathHelper = function (pathIn) {
	var newUrl
	, local = this;
	// append the pathIn argument to the existing url
	['_view', '_design', '_update'].forEach(function(tag) {
		if (pathIn.split('/')[0] === tag) {
			if (pathIn.split('/').length === 1) {
				// if the local[tag] does not have the _tag prepended, then fix it
				if (local[tag].charAt(0) !== '_') {
					local[tag] = [ tag, local[tag] ].join('/');
				}
				// append the default 
				newUrl = [ local.url(), local[tag] ].join('/');
			} else {
				// append the pathIn provided by the app
				newUrl = [ local.url(), pathIn ].join('/');
			}
		}				
	});
	return newUrl;
};

// check for reserved document id's
if (id && id.charAt(0) === '_') {
	// extend the path for _view, _design, and _update
	if (pathHelper.call(this, id)) {
		that.set('url', pathHelper.call(this, id));
	} else {
		that.set('url', [ this.url(), id].join('/'));
	}
} else if (id) {
	// set an _id attribute for all other doc types
	that.set('_id', id);
	that.set('url', [ this.url(), id ].join('/'));
}


*//* ===================================================
 * bulk.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global _: true, bx: true */

(function(global) {
	"use strict";
	// Purpose: routines for bulk saving and removing
	var bulk = function (doclist, prohibit) {
		var owner = this.doc() 
		, that = this.doc('_bulk_docs')
		, lastResponse = [];
				
		// extend the bulk object with the owner db object
		that.docs = { 'docs': doclist || [] };
		that.Max = undefined;
		
		// tells couchdb to commit the change before returning a response
		that.headers.set('X-Couch-Full-Commit', false);
		
		// use POST
		that.set('_method', 'POST');
		
		var checkSource = function (doc) {
			var attributes;
			
			// if doc is an object, then use post() to get the contents
			if (!prohibit) {
				if (_.isFunction(doc.get) && doc.get('_id')) {
					// filter '_' attributes, except _id, _rev, _attachments
					 attributes = _.reduce(_.omit(doc.post(), ['_id', '_rev', '_attachments']), 
						function(result, value, key) {
							if (key.charAt(0) === '_') {
								result.push(key);
							}
							return result;
					},[]);
					return _.omit(doc.post(), attributes);
				}				
			}
			// otherwise return the doc
			return doc;			
		} 

		// What it does: Returns an array to the caller with false at the index
		// of the doc if it succeeded, and the document information if it failed
		var status = function() {
			return _.map(lastResponse, function(doc) {
				return (doc && doc.error === 'conflict') ? doc : false;
			});
		};
		that.status = status;

		var save = function (handler) {
			var local = this;
			// updates is the design document containing update methods	
			if (_.isFunction(this.maker)) {
				var funcs = this.maker().updates || { 'dummy': function() {} };
				// iterate the update functions to run before posting
				_.each(this.docs.docs, function (doc) { 
					_.each(funcs, function (update_method) {
						try {
					//		update_method(doc);							
						} catch (e) {
							console.log(new Error('[bulk] update method failed.'));
						}
					});
				});				
			}

			// What this does: Sends the bulk data out in MAX slices;
			// does no checking for update conflicts. saving or removing docs without their _rev will fail
			(function (handler) {
				var doclist=_.clone(local.docs.docs)
					, Queue= _.queue();

				// Create a Queue to hold the slices of our list of docs
				var doclistSlice = function (data) {
					local.exec({ docs: data }, function (err, response) {
						handler(err, response);	
						Queue.finish();
					});						
				};
				// submit to the queue until there are no more
				if (local.Max && (doclist.length > local.Max)) {		
					while (doclist.length > local.Max) {
						Queue.submit(doclistSlice, doclist.slice(0,local.Max));
						doclist = doclist.slice(local.Max);
					}
				}

				// Submit a final job of remaining docs
				Queue.submit(doclistSlice, doclist);
				Queue.run();
			}(handler));
			return this;
		};
		// we use the 'doc' object to do the actual save, so keep it in 'superiorSave'
		that.superiorSave = that.save;
		that.save = save;

		var remove = function (handler) {
			var local = this
			, doclist={ docs: [] }
			, buffer = []
			, eachDoc = function (headinfo) {
				var path = _.fetch(headinfo, 'path', 'url', 'request');
				buffer = path.split('/');
				return({ 
					'_id': buffer[buffer.length-1], 
					'_rev': local.getRev(headinfo),
					'_deleted': true 
				});							
			};

			// if the caller sets _rev for one, then must for all; check only the first doc
			if (this.docs.docs.length > 0 && 
				this.docs.docs[0].hasOwnProperty('_rev') && 
				this.docs.docs[0].hasOwnProperty('_deleted')) {
					this.exec(local.docs, handler);					
			} else {
				// otherwise, use the HEAD method to quickly get the _revs for each document
				this.docs.docs.forEach(function(nextDoc) {
					
					owner.doc(nextDoc._id).head(function(err, headinfo) {
						if (err) {
							return handler(err, headinfo);
						}
						doclist.docs.push(eachDoc(headinfo));
						// do this when all the _revs have been found
						if (doclist.docs.length === local.docs.docs.length) {
							local.docs.docs = doclist.docs;
							local.exec(local.docs, handler);					
						}
					});
				});				
			}
		};
		that.remove = remove;

		var exec = function (docsObj, callback) {
			
			// if the application set X-Couch-Full-Commit to true, set the batch=ok option
			if (this.headers.get('X-Couch-Full-Commit') === true) {
				this.options.set('batch', 'ok');				
			}
			
			this.source(docsObj)
				.superiorSave(function(err, response) {
					if (err && response && response.code > 399) {
						return(callback(err, response));
					} else {
						lastResponse = response && response.body;						
					}
					// status() returns an array of responses. if any failed, 
					// err will have the index of the first error (first === 1)
					status().forEach(function(item, index) {
						if (item) {
							err = err || (item && index+1)
						}
					});
					response.status = status;
					callback(err, response);				
			});
		};
		that.exec = exec;
		
		var max =  function (max) {
			this.Max=_.toInt(max);
			return this;
		};
		that.max = max;

		var push = function (item, handler) {
			if (item) {
				this.docs.docs.push(checkSource(item));
				if (handler && 
					_.isFunction(handler) && 
					this.docs.docs.length===this.Max) {
					this.save(handler);
					this.docs.docs = [];
				}
			}
			return this;
		};
		that.push = push;

		var getLength = function () {
			return this.docs.docs.length;
		};
		that.getLength = getLength;
		
		// check to see if doclist objects are 'doc' objects or source objects and convert if nec.
		that.docs.docs.forEach(function(doc, index) {
			that.docs.docs[index] = checkSource(doc);
		});
		return that;
	};
	global.bulk = bulk;
	
}(Boxspring));
/* ===================================================
 * design.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global _: true, Boxspring: true, emit: true, sum: true */

(function(global) {
	"use strict";

	var templateDesign = function() {
		return({
			'language': 'javascript',
			'updates': {},
			'views': {
				'lib': {}		
			},
			'shows': {},
			'lists': {}
		});		
	};
	
	// What it does: Templated data structure for a CouchDB design document; 
	// map functions of defaultDesign are capable of also running in Nodejs.
	var defaultDesign = function () {
		// Note: CouchdDB defines toJSON globally to its environment, this won't be there on the server
		var toJSON = function(o) {
			return(JSON.stringify(o));
		};
		// Note: This code may run on the server, where exports may not be defined.
		if (typeof exports === 'undefined') {
			var exports = {};
		}

		return({
			'language': 'javascript',
			'updates': {
				// want to force all my documents to have a created_at, size, last_updated;
				// able to pass in additional key-values to the in-place method
				// applications should use this method to enforce their 'type'-ing
				"in-place" : function (doc, req) {
					var i;

					if (req && req.query) {
						for (i in req.query) {
							if (req.query.hasOwnProperty(i)) {
								doc[i] = req.query[i];
							}
						}		
					}
					doc['last-updated'] = Date();
					doc['in-place-succeeded'] = true;
					doc.size = JSON.stringify(doc).length;
					return [doc, toJSON(doc) ];
				}				
			},
			'views': {
				'lib': {},
				'Index': {
					'map': function (doc) {
						if (doc && doc._id) {
							emit(doc._id, doc);
						}
					},
					'reduce': function(keys, values, rereduce) {
						if (rereduce) {
							return sum(values);
						}
						return values.length;
					},
					'header': {
						'sortColumn': '_id',
						'keys': ['_id'],
						'columns': ['_id', 'doc']
					}
				}			
			},
			'shows': {},
			'lists': {}
		});
	};
	
	var design = function (name, custom) {
		// extend this object with the db methods from the caller
		var ddoc = {}
		, maker
		, views 
		, that = _.extend({}, this.doc());
		
		if (name && _.isFunction(name)) {
			custom = name;
			name = this._design;
		} else if (!name) {
			name = this._design;
		} else {
			that._design = name;
		}

		// update the url for this design object
		if (name.split('/').length > 1) {
			that.url([ that.url(), name ].join('/'));
		} else {
			that.url([ that.url(), '_design', name ].join('/'));			
		}

		var configure = function (target, maker) {
			// update the document object with 
			target.headers.set( 'X-Couch-Full-Commit', false );
			target.maker = maker;
			target.views = maker().views;
			target.types = maker() && maker().types;
			target.formats = target.views && target.views.lib && target.views.lib.formats;			
		};
		// configure the object with its maker function: custom or owner or default
		configure(that, (custom || this.maker || defaultDesign));

		var extend = function(section, name, object) {
			var reduceFunc = object && object.reduce;
			
			if (!ddoc[section]) {
				ddoc[section] = {};
			}
			
			if (!ddoc[section][name]) {
				ddoc[section][name] = {};
			}
			
			if (section === 'views' && (object && object.map)) {
				if (typeof object.map === 'function') {
					ddoc.views[name].map = _.Serialize(object.map);
				}
				if (reduceFunc) {
					if (typeof reduceFunc === 'function') {
						ddoc.views[name].reduce = _.Serialize(reduceFunc);
					} else {
						ddoc.views[name].reduce = reduceFunc;
					}
				} else {
					ddoc.views[name].reduce = '_count';
				}
				
				ddoc.views[name]['header'] = (object && object.header) 
															|| { 'keys': [], 'columns': [] };												
			} else if (section === 'views' && name === 'lib') {
				_.each(_.keys(object), function(key) {
					// Don't serialize .lib functions. they are not used on the server side
					// and so won't be saved to the design document anyways; When the client 
					// fetches a design document we just want the object [Function]
					ddoc.views.lib[key] = object[key];
				});
			}	
		};
		that.extend = extend;
				
		// fetches the design document from the server, and updates the 'maker' function
		var fetch = function(callback) {
			var design = this
			, originalMaker = design.maker;
			
			this.read(function(err, response) {
				var template = templateDesign();
				if (err) {
					return(err, response.body);
				}
				
				// upon reading from the server, the new maker function extends the original
				// with views/shows/lists residing in the design document on the server;
				_.each(_.keys(template), function(key) {
					template[key] = _.extend({}, response.data[key], originalMaker()[key]);
				});

				design.maker = function() {
					return template;
				};
				// update the configuration of this object;
				configure(design, design.maker);
				
				if (_.isFunction(callback)) {
					callback(err, {'ok': true, 'message': 'Fetched design document.'});
				}
			});
			return this;
		};
		that.fetch = fetch;

		// set the language
		ddoc.language = 'javascript';

		// add application views
		ddoc.views = {};	
		_.each(that.views, function (views, name) { 
			var mapFunc = views.map
				, reduceFunc = views && views.reduce
				, header = views && views.header;
				
			if (name !== 'lib' && !mapFunc) {
				throw new Error ('design(): Named view is not provided by Maker function - '+name);
			}
			extend.call(that, 'views', name, views);
		});

		// 'updates', 'shows', 'lists' 
		['updates', 'shows', 'lists'].forEach(function(item) {
			ddoc[item] = {};
			_.each(that.maker()[item] || [], function (toString, name) { 
				ddoc[item][name] = {};
				ddoc[item][name] = _.Serialize(toString);
			});
		});

		// add the 'types' structure, if it exists
		if (that.maker().hasOwnProperty('types')) {
			ddoc.types = that.maker().types;
		}
		
		// add validate_doc_update, if it exists
		if (that.maker().hasOwnProperty('validate_doc_update')) {
			ddoc.validate_doc_update = _.Serialize(that.maker().validate_doc_update);
		}
		
		// finally update the design document content using method
		that.source(ddoc);

		// if there is no default _view for this design, then use the first view supplied
		if (!that['_view']) {
			that['_view'] = '_view/' + _.keys(that.views)[0];
		}
		
		// 'name' argument is the name of the '_update/' routine
		var updateDoc = function (name) {
			var owner = this
			, doc = this.doc();
			
			if (!name) {
				name = owner._update;
			}

			// update the url for this update object
			if (name.split('/').length > 1) {
				doc.url([ owner.url(), name ].join('/'));
			} else {
				doc.url([ owner.url(), '_update', name ].join('/'));			
			}
			
			// make this the default
			doc.headers.set('X-Couch-Full-Commit', false);		

			// this update takes advantage of CouchDB 'updates' handlers. 
			// The design document function specified in '_update' will execute on 
			// the server, saving the round-trip to the client a enforcing consistent
			// attributing of the documents on the server for a corpus.
			var commit = function (targetId, properties, handler) {
				// targetId and properties are 'optional'
				handler = _.toArray(arguments)[arguments.length-1];
				
				if (_.isFunction(targetId)) {
					properties = {};
					targetId = undefined;
				} else if (_.isString(targetId) && _.isFunction(properties)) {
					properties = {};
				} else if (_.isObject(targetId) && _.iFunction(properties)) {
					properties = targetId;
					targetId = undefined;
				}
				
				// install the new properites in the doc to be updated
				if (_.keys(properties)) {
					doc.options.update(properties);
				}
				
				// update the url, if needed
				if (targetId) {
					doc.url([ this.url(), targetId ].join('/'));					
				} else {
					// if there is no id, then the method is POST, not PUT
					doc.set('_method', 'POST');
				}
				
				doc.save(handler);
				return this;			
			};
			doc.update = commit;
			return doc;		
		};
		that.updateDoc = updateDoc;
		return that;	
	};
	global.design = design;
	
}(Boxspring));
/* ===================================================
 * view-utils.js v0.01
 * https://github.com/rranauro/base-utilsjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global _: true, Boxspring: true */

(function(global) {
	"use strict";

	// What it does: Helper function for 'get' routine. To make sure only relevant combinations
	// of query parameters are sent to the server
	var translateQuery = function (source) {
		var target = _.clean(source)
		, selector
		, value
		, validQueries = {
			'group': {
				1: ['group', 'reduce', 'descending', 'stale'],
				0: ['reduce', 'descending', 'stale']
			},
			'reduce': {
				1: ['reduce', 'group_level', 'startkey', 'endkey', 
				'key', 'keys', 'descending', 'stale'],
				0: ['reduce', 'limit', 'startkey', 'endkey', 
				'key', 'keys', 'include_docs', 'descending', 'stale']
			}
		};

		if (_.has(target, 'group')) {
			selector = 'group';
		} else {
			selector = 'reduce';
			target.reduce = target.reduce || false;
		}
		value = target[selector] ? 1 : 0;
		try {
			target = _.pick(target, validQueries[selector][value]);
		} catch (e) {
			throw new Error('view.translateQuery(): Invalid query combination.'); 
		}
		return target;
	};
	
	// Validates the query parameters for a CouchDB query;
	var isValidQuery = function (s) {
		var target = {} 
		, validCouchProperties = [
		'reduce', 'limit', 
		'startkey', 'endkey', 
		'group_level', 'group', 
		'key', 'keys',
		'rev' ]
		, formatKey = function(target, key, exclude) {
			if (_.has(target, key) && typeof target[key] !== 'undefined') {
				target[key] = JSON.stringify(target[key]);
				target = _.omit(target, exclude);
			}
			return(target);
		};

		// remove residual application parameters
		target = _.extend(_.pick(_.clean(s), validCouchProperties));

		// couchdb needs properly formatted JSON string
		if (_.has(target, 'key')) {
			target = formatKey(target, 'key', ['keys', 'endkey', 'startkey']);
		} else if (_.has(target,'keys')) {
			target = formatKey(target, 'keys', ['endkey', 'startkey']);					
		} else if (_.has(target, 'startkey')) {
			target = formatKey(target, 'startkey');
			if (_.has(target, 'endkey')) {
				target = formatKey(target, 'endkey');
			}
		}
		// reduce has to be true or false, not 'true' or 'false'
		if (_.has(target, 'reduce') && typeof target.reduce === 'string') {
			target.reduce = _.coerce('boolean', target.reduce);
		}

		// Enforces rule: if group_level specified, then reduce must be true
		if (typeof target.group_level === 'number' && 
			typeof target.reduce === 'boolean' && 
			target.reduce === false) {
			target.reduce = true;
			console.log('reduce must be true when specifying group_level');
		}
		// 'limit' and 'group_level' must be integers
		['limit', 'group_level'].forEach(function(key) {
			if (_.has(target, key)) {
				target[key] = _.toInt(target[key]);
				if (!_.isNumber(target[key])) {
					throw new Error('isValidQuery(): key ' +  value + ' must be a number');
				}
			}
		});
		// if reduce=true, then include_docs can't be true
		if (typeof target.include_docs !== 'undefined'&& 
			target.include_docs === true && 
			typeof target.reduce !== undefined && 
			target.reduce === true) {
			target = _.omit(target, 'include_docs');
			console.log ('unable to apply include_docs parameter for reduced views');
		}
					
		return _.reduce(target, function(result, item, key) {
			result[key] = encodeURI(item);
			return result;
		}, {});
	};
	
	var view = function (name, system) {	
		var that = _.extend(this.doc(), _.events())
		, query = {};
		
		// view must be called from a design, check the base url
		if (this.url().indexOf('_design') === -1) {
			that = this.design().view(name, system);
		} else {
			// else align the arguments as necessary
			if (name && _.isObject(name)) {
				system = name;
				name = this._view;
			} else if (!name) {
				name = this._view;
			} else {
				that._view = name;
			}

			// update the url for this view object; be forgiving if the caller did not supply the 
			// prepended '_view'
			if (name.split('/').length > 1) {
				that.url([ this.url(), name ].join('/'));
			} else {
				that.url([ this.url(), '_view', name ].join('/'));			
			}			
		}

		that.system = _.hash((system) || {	
			'asynch': false,
			'cache-size': undefined, //10,
			'page-size': undefined, //100,
			'delay': 0.5 
		});
		system = that.system.post();
						
		// rule: if reduce=true then page-size=0, asynch=false;
		if (_.has(query, 'reduce') && query.reduce === true) {
			system['page-size'] = 0;
			system.asynch = false;
		} else if (system.asynch === true) {
			system['cache-size'] = system['cache-size'] || Number.MAX_VALUE;
		}
		
		var fetchView = function (server) {
			var tRows = 0
			, db = this
			, events = this
			, emitter = this.emitter
			, nextkey;

			var nextQuery = function(query, startkey) {
				// only called with a startkey by 'chunk' on subsequent invokations
				// thus, will only happen when 'asynch===true'
				if (startkey) {
					return(_.extend(query, {
						'startkey_docid': startkey.id, 
						'startkey': startkey.key }));
				}
				return query;
			};

			var nextLimit = function(query, size) {					
				if (system.asynch && _.isNumber(size) && size > 0) {
					return(_.extend(query, { 'limit': system['page-size']+1 }));
				}				
				return query;
			};

			var chunk = function (startkey) {				
				// remaining cache-size get smaller on each successive fetch
				system['cache-size'] = _.isNumber(system['cache-size']) 
					? system['cache-size']-1 
					: undefined;

				db.options.update(nextQuery(query, startkey));
				db.options.update(nextLimit(query, system['page-size']));
				
				// _all_docs is a special case view; 
				if (db.url().split('/')[db.url().split('/').length-1] === '_all_docs') {
					// use the built-in all_docs method
					db.read = db.all_docs;
				} else {
					// update the query options;
					db.options.update(isValidQuery(query));
				}
				
				// execute the query and process the response
				db.read(function(err, response) {
					//console.log('got response!', response.code, response.request, response.body);
					if (err) {
						events.trigger('view-error', err, response);
					} else {
						//console.log('db.query after', design, index, query);
						if (system.asynch && response.body && _.has(response.body, 'rows')) {	
							response.body.nextkey = 
								response.body.rows[response.body.rows.length-1];
							nextkey = response.body.nextkey;	
							response.queryOptions = query;
							response.moreData = events.moreData;

							// trim the rows, because we got page-size+1
							if ((system['page-size'] > 0) && 
								(response.body.rows.length > system['page-size'])) { 
									response.body.rows = 
									response.body.rows.slice(0,response.body.rows.length-1);
							}

							if (!_.has(response.body, 'total_rows')){
								// reduce fetches don't produce offset/total_rows
								// for now, there is no paging reduced views from the server;
								response.body.offset = 0;
								response.body.total_rows = response.body.rows.length;
							} 
							tRows += response.body.rows.length; 
						}
						//console.log('moving to chunk data', response.body.total_rows);
						events.trigger('chunk-data', response);
					}
				});
			};

			events.on('chunk-data', function (res) {
				// if I've got less than the full index; and asynchronous request
				//console.log('chunk-data', res.body.rows.length > 0, tRows < res.body.total_rows, (system.asynch === true && system['cache-size']), res.body.offset);
				
				if ((res.body.rows.length > 0 && tRows < res.body.total_rows) && 
					(system.asynch === true && system['cache-size'])) {
						// pause so we don't flood the browser and the net						
						_.wait((system && system.delay) || 1/10, function() {
							chunk(res.body.nextkey);						
						});
				} else {
					// if we're building the index internally, call it here. the prefetch is 
					// 'all_docs' with 'include_docs' = true
					if (server === 'node' && emitter) {
						_.map(res.body.rows, function(item) {
							return emitter.map.call(this, (item && item.doc) || item);
						});
						emitter.getRows(res.body);
						tRows = res.body.total_rows;					
						events.trigger('chunk-finished', res);
					}
				}
			});

			this.moreData = function () {
				system['cache-size'] += 1;
				chunk(nextkey);
			};
			chunk();		
		};

		// if 'node' server is requested, then built-in server side view will be used.
		// generate the list of docs for this db
		var node = function () {
			var events = this;

			events.on('chunk-finished', function (res) {
				events.trigger('view-data',  res);
			});
			fetchView.call(this, 'node');
		};

		var couch = function () {
			var events = this;

			events.on('chunk-data', function (res) {	
				//console.log('got this chunk data', res.body.total_rows);								
				events.trigger('view-data', res);
			});
			fetchView.call(this);
		};
		
		var end = function (server, eventHandler) {
			var machine = {
				'couch': couch,
				'node': node
			} 
			, res = _.events()
			, requestEvents = this
			, local = this;

			// Note: Responses from this method are evented. 
			eventHandler(res);
			// execute the view by calling the requested server function
			machine[server].call(local, res, this.query);

			this.on('view-data', function (response) {
				if (response.code === 200) {
					res.trigger('data', response);
				} else {
					res.trigger('view-error', response);
				}
			});

			this.on('view-error', function (err, response) {	
				requestEvents.trigger('error', err, response);
			});
			return this;					
		};
		that.end = end;
		
		// Purpose: wrapper for evented .view function. 
		// Default behavior 'asynch: true'  to execute callback only on the first 
		// delivery of data from the server. 
		// 'asynch: false' (or undefined) executes the callback each time and the 
		// application has to manage the data
		var fetch = function (options, callback, callerDataCatcher) {
			var local = this 
			, triggered = false
			// caller can provide an object to wrap the data, ie. data method of "Result" object;
			, caller = (callerDataCatcher && _.isFunction(callerDataCatcher)) 
				? callerDataCatcher 
				: function (x) { return x; };							


			// fetch may be called with just a callback, no options;
			if (_.isFunction(options)) {
				callback = options;
				options = {};
			}
			
			// update the 'query' options
			this.options.update(translateQuery(options));
			query = this.options.post();

			// make a copy of the 'system' options
			system = _.clone(this.system.post());
			
			// rule 1: if reduce=true then page-size=0, asynch=false;
			// rule 2: if startkey/endkey then page-size=0, asynch=false;
			if ((_.has(query, 'reduce') && query.reduce === true) ||
				_.has(query, 'startkey') && _.has(query, 'endkey')) {
				system['page-size'] = 0;
				system.asynch = false;
			} else if (system.asynch === true) {
				system['cache-size'] = system['cache-size'] || Number.MAX_VALUE;
			}

			this.on('error', function (err, response) {
				callback(err, response);
			});

			this.end('couch', function(res) {
				res.on('data', function (r) {
					// create a result object instrumented with row helpers 
					// and design document info
					var result = _.events(local.rows(r, local.maker()));	
					if (callback && _.isFunction(callback)) {
						if (system && system.asynch === false) {
							// just write wrapped data to the calling program. 
							//console.log('got data!', caller(result), caller === _.item);
							callback(null, caller(result));
						} else if ((system && system.asynch === true) && 
							triggered === false) {
							// let calling program continue, continuously receive data
							callback(null, caller(result));
							triggered = true;								
						} else {
							// add data to Result object of the caller
							caller(result);
						}
					}
				});			
			});
			return this;
		};
		that.fetch = fetch;
		
		// Purpose: Emulates CouchDB view/emit functions on the "client"
		// TBD: Not tested
		var emulate = function (name) {
			// When running in node.js, calling functions need to find 'emit' in its scope 
			// On server side, will use couchdb's built-in emit()
			var emitter = function(viewfunc) {
				var tree = global.Btree()
					, map = (viewfunc && viewfunc.map)
					, reduce = (viewfunc && viewfunc.reduce);

				var emit = function (key, value) {
					tree.store(JSON.stringify(key), value);
				};
				tree.emit = emit;
				tree.map = map;
				tree.reduce = reduce;
				return tree;
			}
			, e = emitter(this.maker().views[name]);
			emit = e.emit;
			return(e);
		};
		that.emulate = emulate;
		return that;		
	};
	global.view = view;

}(Boxspring));	
/* ===================================================
 * rows.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global _: true, Boxspring: true */

(function(global) {
	"use strict";
	
	var Rows = function (response) {		
		// Object for adding methods and data to rows of a 
		// response data object based on information about the design
		var design = this
		, ddoc = this.views
		, view =  this._view.split('/').length > 1
			? this._view.split('/')[1]
			: this._view
		, that = _.extend({}, response)
		, thisSelected = [];
		
		if (ddoc && view && ddoc[view] && ddoc[view]['header']) {
			that.sortColumn = ddoc[view]['header'].sortColumn || []; 
			that.columns = ddoc[view]['header'].columns || [];
			that.keys = ddoc[view]['header'].keys || [];
		} else {
			that.columns = [];
			that.keys = [];
		}

		// initialize 'displayColumns'.
		that.displayColumns = that.columns;

		// initialize the 'cell' object methods to allow typing and formatting individual cells
		that.cell = this.cell(design && design.types, design && design.formats);
		
		// wrap each row in a row object and make the response object available to all methods
		if (response) {
			that.response = response;
			response.body.rows = _.map (response.body.rows, function (row) {
				return design.row(that, row);
			});			
		}
		
		// HELPERS
		// allow the caller to iterate using each or map;
		var rows = function () {
			return this.body.rows;
		};
		that.rows = rows;
		
		var offset = function () {
			return this.body.offset;
		};
		that.offset = offset;
		
		var first = function () {
			return this.body && this.body.rows[0];
		};
		that.first = first;

		var last = function () {
			return this.body.rows[this.body.rows.length-1];
		};
		that.last = last;
		
		// return the row record at the given index. return the first or last if no index or the
		// index given is out of bounds.
		var getRow = function(index) {
			if (index > -1) {
				if (index < this.getLength()) {
					return this.body.rows[index];
				} 
				return this.last();
			}
			return this.first(); 
		};
		that.getRow = getRow;
		
		var total_rows = function () {
			return (this.body && this.body.total_rows) || 0;
		};
		that.total_rows = total_rows;
		
		var getLength = function () {
			return this.body.rows.length;
		};
		that.getLength = getLength;
		
		// What it does: returns the list of unique values for a key 'facet' over the set of rows
		var facets = function (name) {	
			return _.compact(_.uniq(_.sortBy(_.map(this.rows(), function(row) {
			//	console.log('selecting', name, row.select(name));
				var s = row.select(name);
				return (s && s.toString());
			}), _.item)), true);
		};
		that.facets = facets;
		
		// What this does: runs the filter through each row to produce an array of indexes of rows that pass
		// array is passed to getSelected to return a result object with rows that pass.
		var filter = function(object) {
			return (this.getSelected(_.reduce(this.rows(), function(result, row, index) {
				if (row.filter(object)) {
					result.push(index);
				}
				return result;
			}, [])));
		};
		that.filter = filter;
		
		// setter/getter for indicating a list of rows is 'selected'
		var getSelected = function (selectedRows) {
			var selectedRowData = _.clone(response)
			, local = this;
			
			// if some have been marked selected, map those rows; else just return everything
			if (selectedRows.length > 0) {
				selectedRowData.body.rows = _.map(selectedRows, function(index) {
					return local.getRow(index);
				});
			}
			// make a new rows object from this data and return it;
			return Rows.call(design, selectedRowData);
		};
		that.getSelected = getSelected;

		var sortByValue = function (iterator) {
			var compare = iterator || function (row) { return -(row.getValue()); };

			// for each pages, sort
			return this.getSelected(_.sortBy(this.rows(), compare));
		};
		that.sortByValue = sortByValue;

		// helper: called on a 'reduce': true view to get the first and last keys of an
		// index. knows nothing about the type, so range can be anything.
		var range = function () {
			return({ 'start': this.first().getKey(), 'end': this.last().getKey() });
		};
		that.range = range;

		var getSortColumn = function (c) {
			if (c) {
				this.sortColumn = c;
			}
			return this.sortColumn;
		};
		that.getSortColumn = getSortColumn;

		// setter/getter for modifying the list of columns to display;
		var getDisplayColumns = function(d) {
			if (d) {
				this.displayColumns = _.isArray(d) && d;
			}
			return (((this.displayColumns).length && this.displayColumns) || this.columns);
		};
		that.getDisplayColumns = getDisplayColumns;
		
		var setDisplayColumns = function(access) {
			return this.getDisplayColumns(this.calcDisplayColumns(access));
		};
		that.setDisplayColumns = setDisplayColumns;
		
		// What it does: given a source ('doc', 'value'), iterate over a set of rows and calculate
		// the set of properties contained in the rows
		var calcDisplayColumns = function(access) {
			var columns = {};
			
			access = access || function(row) {
				// the 'map-reduce' value is the priority if there are over lapping keys for a row
				return _.extend({}, 
					row.doc && row.doc.resource || {},
					row.doc || {}, 
					row.value || {});
			}

			_.each(this.rows(), function(row) {
				_.each(_.keys(access(row)), function(key) {
					columns[key] = true;
				});
			});
			return _.keys(columns);
		};
		that.calcDisplayColumns = calcDisplayColumns;

		// What it does: returns the index of the column requested, 
		// or 'sortColumn', or 0 if not found
		var column2Index = function (c) {
			var column = c || this.getSortColumn()
			, activeColumns = this.columns2Display || this.columns;
			return	(_.found(activeColumns, column) ?
						_.fetch(activeColumns, column) : 0);
		};
		that.column2Index = column2Index;

		// What it does: converts an integer index into the column list and 
		// returns the name of the column
		var index2Column = function (i) {
			var index = _.isNumber(i) ? i : column2Index();
			return this.displayColumns[index] || this.columns[index];
		};
		that.index2Column = index2Column;

		// What this does: use the names of the columns to determine the 'type' 
		// of the column and sort based on that type
		var sortByColumn = function (reverse) {
			var direction = (reverse) ? -1 : 1
			, local = this;

			this.displayColumns = _.sortBy(this.columns, function (x) {

				if (_.isNumber(x) || !_.isNaN(_.toInt(x))) {
					return (_.toInt(x) * direction);
				}
				// else returns the position in the array
				return (_.fetch(local.columns, x) * direction);
			});

			return this;
		};
		that.sortByColumn = sortByColumn;
		return that;
	};
	global.rows = Rows;
	
}(Boxspring));
/* ===================================================
 * row.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global _: true, Boxspring: true */

(function(global) {
	"use strict";

	var row = function (owner, currentRow) {		
		// Object for creating a hash out of the row for accessing and manipulating it
		var that = _.extend({}, currentRow, _.hash());
		that.columns = (owner && owner.columns) || [];
		that.keys = (owner && owner.keys) || [];
		that.visible = (owner && owner.visible) || _.hash();
		that.cell = (owner && owner.cell);

		var getKey = function (index) {
			var key = _.isArray(this && this.key) ? this.key : [ this && this.key ];
			return typeof index !== 'undefined' ? key[index] : key;
		};
		that.getKey = getKey;

		var getValue = function () {
			return typeof this.value === 'string'
				? this.value
				: _.extend({}, 
				this.doc || {}, 
				(this.doc && this.doc.resource) || {}, 
				this.value || {});
		};
		that.getValue = getValue;
		
		// add the key/values for this row to the hash;
		if (typeof that.getValue() === 'string') {
			that.update({'value': that.getValue() });
		} else {
			that.update(that.getValue());
		}
		
		// any columns not in the keys have to match by name, except for the special case when 'value' is a string
		// and not an object;
		_.difference(that.columns, that.keys).forEach(function(name, index) {
			if (!that.get(name)) {
				that.set(name, that.get('value'));
			}
		});
		
		// use position to store the key-values by name
		that.keys.forEach(function(name, index) {
			that.set(name, that.getKey(index));
		});
		
		

		// What it does: return the value of 'name' in this row
		var select = function (name) {
			return this.get(name) || (name === 'id' && this.id);
		};
		that.select = select;

		// What it does: returns true if value of 'name' equals 'value'
		var selectFor = function (name, value) {
			var selected = _.isString(this.select(name)) 
				? this.select(name).toLowerCase() 
				: this.select(name)
			, val = _.isString(value) 
				? value.toLowerCase()
				: value;			
			return (selected === val);
		};
		that.selectFor = selectFor;

		// What it does: filter the object key/value pairs against the row key/values. If all keys pass, then
		// the row passes;
		var filter = function(object) {
			var row = this
			, len = _.reduce(object, function(result, value, key) {
				if (row.select(key) === value) {
					result.push(key);
				}
				return result;
			},[]);
			return (len === _.keys(object).length);
		};
		that.filter = filter;
		return that;
	};
	global.row = row;

}(Boxspring));
/* ===================================================
 * access.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global _: true, Boxspring: true */

(function(global) {
	"use strict";

	// formats a cell value based on type information
	var cell = function (ownerTypes, formats) {
		var validTypes = ['string','number','boolean','date','datetime','timeofday','object','array']
		, that = {};
		
		that.builtInColumns = _.hash({
			'year': ['number',1],
			'month': ['number',1],
			'country': ['string',2],
			'city': ['string',2],
			'state': ['string',2],
			'address': ['string',4],
			'count': ['number',1],
			'sum': ['number',1],
			'average': ['number',1],
			'keyword': ['string',1],
			'index': ['number',1],
			'values': ['object',2],
			'row total': ['number',1],
			'column total': ['number',1],
			'view': ['string', 1],
			'summary': ['object', 8] 
		});

		// if there is a format function for cells, then the caller passes it in from the design;
		that.formats = formats;
		
		var thisType = function (key) {
			return _.isArray(key) ? key[0] : 'string';
		};
		that.thisType = thisType;

		var thisWidth = function (key) {
			return _.isArray(key) && key.length > 1 ? key[1] : 2;
		};
		that.thisWidth = thisWidth;

		var hasType = function (key) {
			return this.builtInColumns.contains(key) ? true : false;
		};
		that.hasType = hasType;

		var getType = function (key) {
			return(this.thisType(this.builtInColumns.get(key)));
		};
		that.getType = getType;

		var columnWidth = function (key) {
			return (this.builtInColumns.contains(key) && thisWidth(this.builtInColumns.lookup(key))) || 1;			
		};
		that.columnWidth = columnWidth;
		
		// What it does: accepts name/type or object of names/types. Extends the types hash
		// by adding columnTypes to an object with optional width.		
		/*global log: true */
		var columnTypes = function (name, type, width) {
			var buffer = {}
			, local = this;

			// 'name' can be an individual name/type pair, or an object containing a set of name/types
			// if 'type' is not provided, then default to whatever type the 'name' is
			if (typeof name === 'string') {
				buffer[name] = [type || 'string', width || 2];
			} else if (typeof name === 'number') {
				buffer[name] = [type || 'number', width || 1];
			} else if (typeof name === 'object') {
				buffer = name;
			}

			// loop each element in the buffer, and update the builtInTypes hash
			_.each(buffer, function(item, key) {
				if (_.found(validTypes, local.thisType(item))) {
					local.builtInColumns.store(key, item);
				} else {
					throw new Error('[ cell.columnTypes ] - invalid type: ' + item);
				}
			});
			return this;	
		};
		that.columnTypes = columnTypes;
		// extend the builtInTypes hash with types passsed in by the owner
		that.columnTypes(ownerTypes);

		// What it does: Returns a 'cell' object with filled in missing pieces; 
		// Accepts either an object or name, value, type arguments
		var newCell = function(name, value, type) {
			var formats = (this.formats) 
				? this.formats 
				: function() { return {}; }
			, o = typeof name === 'object' ? name : {'name': name, 'value': value, 'type': type }
			, cell = {
				'name': o.name,
				'value': o.value,
				'type': this.getType(o.name),
				'format': o.format,
				'properties': o.properties
			};
			// if there is a formatter function, then call it and return
			if (formats()[cell.name] && cell.value) {
				cell.type = 'string';
				if (_.isString(cell.value)) {
					cell.format = this.formats()[cell.name](cell.value).toString();
				} else {
					cell.format = this.formats()[cell.name](cell.value).toString();
					cell.value = _.reduce(cell.value, function(result, item, key) {
						if (_.isString(item)) {
							result += item;
						}
						return result;
					},'');
				}
				return cell;
			}
			// generic formatter then
			if (cell.type === 'array') {
				cell.value = _.map(cell.value, _.item).join(',');				
				cell.type = 'string';
				return cell;					
			}
			if (cell.type === 'object'){
				cell.value = (cell && cell.value && JSON.stringify(cell.value)) || '';
				cell.type = 'string';
				return cell;
			}
			// otherwise, coerce this value to its type, if you can and return;
			cell.value = _.coerce(cell.type, cell.value);
			return cell;
		};
		that.newCell = newCell;
		that.newColumn = newCell;
		return that;
	};
	global.cell = cell;

}(Boxspring));
/* ===================================================
 * boxspring-jquery.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global $: true, jQuery: true, bx: true, _: true, window: true */

(function () {
	"use strict";
	
	if (typeof jQuery !== 'undefined') {
		(function ($) {
			var methods = {
				exists: function () {
					return this.length;
				},
				parentActive: function () {
					this.parent().addClass('active').removeClass('disabled');				
					return this;
				},
				parentSibsInactive: function () {
					($(this).parent().siblings()).removeClass('active');
					return this;
				},
				// enables active/disable menu and set of siblings
				activateMenuItem: function () {
					$(this).bx('parentActive').bx('parentSibsInactive');
					return this;
				},
				enableDisableMenu: function (menuText) {
					// toggle ON/OFF behavior
					if ($(this).attr('class') === 'active') {
						$(this).text(menuText)
							.parent()
							.removeClass('active')
							.addClass('disabled');
					} else {
						$(this).text(menuText)
							.parent()
							.addClass('active')
							.removeClass('disabled');
					}
					// be sure tag is not disabled
					$(this).parent().removeClass('disabled');
					return this;			
				},
				selected: function () {
					return $(this).get(0);
				},
				tagName: function () {
					return $(this).selected().tagName;
				},
				Id: function () {
					return $(this).attr('id');
				},
				extend: function (newMethods) {
					methods = _.extend(methods, newMethods);
				},
				// What it does: clones a fragment of html with an id, 
				// appends it to the DOM 'hidden' and returns it
				cloneHTML: function (targetId, text) {
					var id =  targetId || _.uniqueId('clone-')
				
					return ($(this).clone().html()
						.replace($(this).bx('Id')+'-id', id)
						.replace($(this).bx('Id')+'-text', text || ''));
				},
				isEmpty: function(){
					if($(this).val()===""){
						return true;
					} else{
						return false;
					}
				},
				// invokes bootstrap-typeahead.js
				typeahead: function (o) {
					$(this).typeahead(o);
					return this;
				}
			};
				
			$.fn.bx = function( method ) {

			    // Method calling logic
			    if ( methods[method] ) {
			      	return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
			    } else if ( typeof method === 'object' || ! method ) {
			      	return methods.init.apply( this, arguments );
			    } else {
			      	$.error( 'Method ' +  method + ' does not exist on jQuery.bx' );
			    }
			};
		}(jQuery));
	}
}());

/* ===================================================
 * google-vis.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global $: true, jQuery: true, Boxspring: true, _: true, window: true */

/*global google: true, document: true, jQuery:true */

if (typeof jQuery === 'undefined') {
	jQuery = {};
}

(function(global) {
	"use strict";
	
	// What this does: takes a wrapped response.data object and makes it ready for a google table
	// Purpose: takes a 'result' object and generates a form of the object compatible with Google
	// visualization tables result: a wrapped response from a CouchDB view
	// cols: an Array of Properties to serve as Column ids
	// Example format:
	/*
	var dt = new google.visualization.DataTable(
	     {
	       cols: [{id: 'task', label: 'Task', type: 'string'},
	                {id: 'hours', label: 'Hours per Day', type: 'number'}],
	       rows: [{c:[{v: 'Work'}, {v: 11}]},
	              {c:[{v: 'Eat'}, {v: 2}]},
	              {c:[{v: 'Commute'}, {v: 2}]},
	              {c:[{v: 'Watch TV'}, {v:2}]},
	              {c:[{v: 'Sleep'}, {v:7, f:'7.000'}]}
	             ]
	     },
	   0.6
	);
	*/
	/*
	'query': result.query,
	'result': result,
	'tags': result.query.post(),
	'onSelection': onSelectionId
	
	*/
	
	var googleVis = function (options) {
		var type = (options && options.type) || 'Table'
		, targetDiv = (options && options.targetDiv) || 'on-display'
		, model = (options && options.model)
		, onSelection = (options && options.onSelection) || function() { return ; }
		, onPage = (options && options.onPage) || function() { return ; };
		
		var vis = {
			'types': ['string', 'number', 'boolean', 'date', 'datetime', 'timeofday']
		};
		
		var dataSource = (function () {
			var local = this
			, data;
			
			/*
			type - A string describing the column data type. Same values as type above.
			label - [Optional, string] A label for the column.
			id - [Optional, string] An ID for the column.
			role - [Optional, string] A role for the column.
			pattern - [Optional, string] A number (or date) format string to display column value.
			*/
			// Routines to format and style the Table
			var googleStyle = function (data) {
				var i, j
				, cols = this.getDisplayColumns()
				, formatter_long;
				
				// Create a formatter and apply to 'date' columns.
				formatter_long = new google.visualization.DateFormat({formatType: 'long'});
				for (j = data.getNumberOfColumns()-1; j > -1; j -= 1) {
					// Reformat 'date' columns.
					if (data.getColumnType(j) === 'date') {
						formatter_long.format(data, j);						
					}
				}

				// What it does: 
				// Adds a classname corresponding to width style cell in the table
				for (i = data.getNumberOfRows()-1; i > -1; i -= 1) {				
					for (j = data.getNumberOfColumns()-1; j > -1; j -= 1) {
						data.setProperties(i, j, {
							'className': 'googleCell' + this.cell.columnWidth(cols[j])
						});
					}
				}
				return data;				
			};
			
			var googleColumn = function (cell, index, id) {				
				// don't allow ineligible column types. 
				// or else google vis will throw an error if an object passes through		
				if (!_.found(vis.types, cell.type)) {
					cell.type = 'string';
				}			
				// 'chart' require their columns, except the 0 column to be 'number'
				//if (chartType === 'LineChart' && typeof index === 'number') {
				//	cell.type = index > 0 ? 'number' : cell.type;
				//}
				return({
					'label': cell.name,
					'type': cell.type || 'string',
					'id': id || _.uniqueId(cell.name),
					'role': undefined,
					'pattern': undefined
				});
			};
			local.googleColumn = googleColumn;

			// What it does: format a boxspringJS cell as a google cell
			var googleCell = function (cell) {
				return ({
					'v': typeof cell.value !== 'undefined' ? cell.value : null,
					'f': cell.format,
					'p': cell.properties
				});
			};
			
			var addRow = function (cols) {
				var row = this;

				data.addRow(_.map(cols, function(key, i) {
					var val = row.select(key);
					return(googleCell.call(row, row.cell.newCell(key, val)));
				}));
			};
			local.addRow = addRow;
			
			var Table = function () {
				// get column labels and the first row; we can use that to setup the columns
				var cols = this.getDisplayColumns()
				, first = this.first();

				// create the DataTable. 'data' is visible only in this context
				data = new google.visualization.DataTable();

				if (!cols || !cols.length){
					throw new Error('googleVis.Table(): Bad or missing column definition.');
				}		

				// formats a column definition for google.vis
				cols.forEach(function(label, index) {
					data.addColumn(local.googleColumn(first.cell.newCell(label), index));							
				});	
				// formats each row in this view
				_.each(this.each(), function(row) {
					local.addRow.call(row, cols);
				});
				return googleStyle.call(this, data);
			};
			local['Table'] = Table;
			
			var result2Array = function() {
				// cols describes the incoming table columns. reset() the visibleColumns
				var local = this
				, cols = this.getDisplayColumns().slice(1)
				, target = []
				, hdrHolder = []
				, rowHolder = []
				, pivotRow = this['pivot-row']
				, pivotColumn = this['pivot-column'];

				// make a header column; for chart, each row's key is the header for a "series"
				_.each(this.each(), function(row) {
					hdrHolder.push(row.select(pivotRow));
				});
				target.push([ pivotColumn ].concat(_.sortBy(hdrHolder, _.item)));

				// initialize our matrix
				hdrHolder.forEach(function(item) { rowHolder.push(0); });
				cols.forEach(function(col) {
					target.push([ col ].concat(rowHolder));
				});
				
				// now process each row and populate the N (x-axis) x M (series) matrix
				_.each(this.each(), function(row) {
					// find 'y's position in the target array
					var y = _.find(target[0], row.select(pivotRow));
					if (y === -1) { 
						throw new Error('result2array(): fatal, could not find item in target'); 
					}
					
					_.keys(row.getValue()).forEach(function(c) {
						var val = row.select(c)
						, x = local.column2Index(c);

						if (x === 0 && y===5) {
							console.log('target[0]', row, c, x, y, val && val.sum);
						}

						if (typeof val !== 'undefined') {
							target[x][y] = val.sum; 
						}
					});
				});
				data = google.visualization.arrayToDataTable(target);		
				return data;
			};
			local['LineChart'] = result2Array;
			return local;
		}.call(vis));
		
		var visibleColumns = function() {
			var rowdata = this.visible.setValues();
			
			return _.map(this.query.get('visibleColumns'), function(index) {
				return vis.query.index2Column.call(vis.query, index); });
		};
		
		var app = function(data) {
			return new google.visualization.DataView(data);
		};
		
		var display = function(type, target) {
			return new google.visualization[type](target);
		};
		
		var googleView = function (o) {
			var local = this
			, data = dataSource['Table'].apply(this)
			, target = document.getElementById(targetDiv) 
			// displayTable sets up the DOM; 
			, displayTable = display(o.type, target)
			// view controls the display but not the underlying table
			, view = app(data); 
			
			// make these resources are visible to the event listeners off of first argument 
			local.display = displayTable;
			local.view = view;

			// process the 'events' arguments and set up listeners
			['select', 'page'].forEach(function(e) {
				if (o.events.hasOwnProperty(e)) {
					google.visualization.events.addListener(displayTable, e, function() {
						o.events[e].apply(null, [local].concat(_.toArray(arguments)));
					});					
				}
			});
			
			var draw = function () {				
				try {
					displayTable.draw(view, o.options);
				} catch (e) {
					throw new Error('draw(): google-vis-error - ' + e);
				}
			};
			local.draw = draw;
			return local;
		};
		
		var googleTable = function (div) {
			var result = this 
			, sortColumn = result.getSortColumn()
			, visibleColumns = result.getDisplayColumns();
			
			// caller can over-ride 
			targetDiv = div || targetDiv;
			
			if (result.getLength() === 0) {
				console.log('[ google-vis.js ] - No rows to process.');
				return ;
			}
			
			console.log('id', result.rid, 'page', result.pageInfo().page, 'offset', result.offset(), 'rows', result.getLength());
				
			// Set up the table and draw it.
			googleView.call(result, { 
				'type': 'Table',
				'options': {
					'showRowNumber': true,
					'allowHtml': true,
//					'firstRowNumber': result.offset(),
					'page': 'event',
					'pageSize': ((result.pageInfo().pageSize-1) || result.getLength()),
					'startPage': result.pageInfo().page || 0,
					// delegating column sorting to the table, for now;
					'sort': 'enable',
					// requested sortColumn exists in the available table
					'sortColumn': _.intersection(sortColumn, visibleColumns).length === 1 
						? sortColumn
						: undefined,
					'sortAscending': true						
				},
				'events': {
					// Purpose: install event handler for 'select'
					'select': function (caller) {						
						// get the integer selected rows
						var Selected = _.map(caller.display.getSelection(), function (s) {
							return s.row;
						});
						
						// if this table is called from a model, update its memory
						if (model) {
							model.set('onSelection', Selected);
						}
						// call the default onSelection callback with the result and the Selected
						onSelection(result, Selected);						
					},
					// Purpose: event handler for 'next' / 'previous' page
					'page': function (caller, o) {
						var startPage = result.pageInfo().page
						, direction = (o.page > startPage) 
							? 'next' 
							: 'previous';
						
						// if this table is called from a model, update its memory
						if (model) {
							model.set('onPage', {'result': result, 'direction': direction });
						}
						// use the callback, if supplied
						onPage({'result': result, 'direction': direction });
					}
				}
			}).draw();
			return this;			
		};
		
		var googleChart = function (div) {
			var result = this;
			
			// caller can over-ride 
			targetDiv = div || targetDiv;
			
			googleView({
				'type': 'LineChart',
				'options': {
					'title': 'Line Chart',
					'focusTarget': 'category',
					'theme': 'maximized',
					'chartArea': {	
						'height': '3000px;'
					}
				},
				'events': {
					'select': function(caller) {
						console.log('select', this, caller, arguments);
						console.log('selected', caller.display.getSelection());			
					}
				}
			}).draw();
		};

		// now return the render function to the caller
		if (type === 'LineChart') {
			vis.render = googleChart;
		} else {
			vis.render = googleTable;
		}
		return vis;
	};
	global.googleVis = googleVis;
}(jQuery));
/* ===================================================
 * base-utils.js v0.01
 * https://github.com/rranauro/base-utilsjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global _: true */


/*global  _: true*/

if (typeof _ === 'undefined') {
	if (typeof exports !== 'undefined') {
		var _ = require('underscore');
	} else if (typeof _ === 'undefined') {
		var _ = {};
		_.mixin = function(object) {
			var property;
			for (property in object) {
				if (object.hasOwnProperty(property)) {
					_[property] = object[property];
				}
			}
		}
	}
}

(function() {
	"use strict";
	var baseUtils = {};

	// test for existence of browser
	var browser = function () {
		return (typeof exports === 'undefined' || typeof window !== 'undefined');
	};
	baseUtils.browser = browser;
	
	// converts a string to a decimal integer
	var toInt = function(s) {
		return _.isString(s) ? parseInt(s, 10) : s;
	};
	baseUtils.toInt = toInt;

	// remove multiple, leading or trailing spaces
	var trim = function (s) {
		if (s) {
			s = s.replace(/(^\s*)|(\s*$)/gi,"");
			s = s.replace(/[ ]{2,}/gi," ");
			s = s.replace(/\n /,"\n");
			return s;				
		}
	};
	baseUtils.trim = trim;
	
	// What it does: takes a string and returns the first character initialized
	var initialCaps = function (str) {
		return _.map(str.split(/_/g), function(s) {
			return s.charAt(0).toUpperCase() + s.slice(1);
		}).join(' ');
	};
	baseUtils.initialCaps = initialCaps;

	// What it does: wraps a function in a closure and returns it so the returned function
	// has access to the arguments of the original function. Useful when firing 'click' events
	var enclose = function(func) {
		var args = _.toArray(arguments).slice(1);
		return function (context) {
			return func.apply(context || null, args);
		};
	};
	baseUtils.enclose = enclose;

	// What it does: Handy utility for handling arguments from function.apply calls when the argument
	// can be a true array or array-like; And, what you want is Array
	var args = function (a) {
		return (_.isArray(a) ? a : _.toArray(arguments));
	};
	baseUtils.args = args;

	// Purpose: finds the index of a value in an Array
	var find = function (items, key) {
		var index;

		if ((_.isString(key) || _.isNumber(key)) && items.length > 0) {
			for (index=0;index<items.length;index+=1) {
				if (items[index] === key) {
					return index;
				}			
			}				
		}
		return(-1);
	};
	baseUtils.ifind = find;
	
	// What it does: return true if the item k is found in array a
	var found = function() {
		return (find.apply(null, arguments) !== -1);
	};
	baseUtils.found = found;

	// What it does: returns true if all the members of k1 are present in k2
	var compare = function (k1, k2) {
		return _.all(k1, function(v){
		    return _.contains(k2, v);
		});					
	};
	baseUtils.compare = compare;

	// What it does: returns true k1 and k2 have the same members in same order
	var identical = function (k1, k2) {
		var i;

		if (k1.length === k2.length) {
			for (i = 0; i < k1.length; i += 1) { 
				if (k1[i] !== k2[i]) {
					return false;
				} 
			}					
		} else {
			return false;
		}
		return true;
	};
	baseUtils.identical = identical;

	// What it does: recursive find function requires a sorted list
	// Specifying 'it' function allows access to array of object properties for 
	// comparison to 'k'
	var bfind = function (a, k, it) {
		var start = 0
			, end = 0
			, iterator = (_.isFunction(it)) ? it : function (i) { return i; };			

		if (k && a) {
			if (a.length-1 === 0) {
				return(a[a.length-1] === k ? a.slice(0,1) : null);
			} 
			end = Math.floor((a.length) / 2);
			if (k === iterator(a[end])) {
				return(a.slice(end,end+1));
			}				
			if (k < iterator(a[end])) {
				return(bfind(a.slice(0, end), a));
			} 
			start = Math.ceil(a.length / 2);
			return(bfind(a.slice(start, a.length), k));				
		}
	};
	baseUtils.bfind = bfind;

	// What it does: coerces the argument into an array, or just returns the suppied array
	var forceToArray = function (l) {
		if (typeof l === 'string' || typeof l === 'number') {
			return [ l ];
		}
		if (_.isArray(l)) {
			return l;
		} 
		return _.toArray(l);
	};
	baseUtils.forceToArray = forceToArray;
	
	// What it does: reverses the order of items in an array
	var reverse = function (a) {
		return _.reduce(a, function(x, y) { x.unshift(y); return x; }, []);
	};
	baseUtils.reverse = reverse;

	var coerce = function(expectedType, value) {
		var types = {
			'string': '',
			'number': 0,
			'array': [],
			'boolean': false
		};
		if (_.isDate(value)) {
			return value;
		}
		if (expectedType === 'date' && !_.isDate(value)) {
			return (value && new Date(value)) || new Date(1900,1,1);
		}
		if (expectedType && typeof value === 'undefined') {
			return types[expectedType];
		}
		if (expectedType && typeof value !== 'undefined') {
			if (expectedType === 'string') {
				return (value && value.toString()) || '';						
			}
			if (expectedType === 'number') {
				return _.isNumber(toInt(value)) ? toInt(value) : types.number;
			}
			if (expectedType === 'array') {
				return _.isArray(value) ? value : [ value || '' ];
			}
			if (expectedType === 'boolean') {
				if (value === 'true') {
					return true;
				}
				if (value === 'false') {
					return false;
				}
				return _.isBoolean(value) ? value : types.boolean;
			}
		}
		return value || '';
	};
	baseUtils.coerce = coerce;

	// What it does: argument to map function to return the next item to map
	var item = function(x) {
		return x;
	};
	baseUtils.item = item;

	// What it does: Filter out characters that resolve to 0;
	var filterNonAscii = function (s) {
		return _.reduce(s, function(str, c, i) {
			if (s.charCodeAt(i) !== 0) {
				str += c;
			}
			return str;
		},'');
	};
	baseUtils.filterNonAscii = filterNonAscii;
	
	var hasNonAlphaNumeric = function (s) {
		return (s.replace(/[^a-z0-9]/gi, '|').split('|').length > 1)
	};
	baseUtils.hasNonAlphaNumeric = hasNonAlphaNumeric;
	
	var filterNonAlphaNumeric = function (s) {
		return _.trim(s.replace(/[^a-z0-9]/gi,'-'));
	};
	baseUtils.filterNonAlphaNumeric = filterNonAlphaNumeric;
	
	// base64 chokes on charCodes > 255
	var filterCharCodes = function(s) {
		// replace newlines and carriage returns with a space. then filter the non-ascii
		return _.reduce(s.replace(/\n/g, ' ').replace(/\r/g, ' '), function(result, x, i) {
			if (s.charCodeAt(i) < 256) {
				result += s[i];
			}
			return result;
		}, '')
	};
	baseUtils.filterCharCodes = filterCharCodes;
	
	// What it does: extracts the properties from the first object based on the 
	// properties in the from array or list of argument strings.
	var select = function(source, from) {
		var target = {}
			, src = source || {}
			, items = []
			, i;

		if (_.isArray(from)) {
			items = from;
		} else {
			for (i=1;i<arguments.length;i+=1) { items.push(arguments[i]);}
		}	

		_.each(items, function(item) {
			if (src.hasOwnProperty(item) && typeof src[item] !== 'undefined') {
				target[item] = src[item];
			} 
		});
		return target;
	};
	baseUtils.select = select;
	
	// What it does: removes key/values from items whose value === 'value'. 
	// Note: undefined is default
	var clean = function(items, value) {
		return (items && _.reduce(_.map(_.keys(items), function(k) { if (items[k] !== value) { 
					return ([k, items[k]]); }
		}), function(target, y) { if (y) { target[y[0]] = y[1]; } return target; }, {}));
	};
	baseUtils.clean = clean;

	// What it does: follows an object until it finds a matching property tag, 
	// then returns the value of it
	var pfetch = function (o, p) {
		var found
			, k;

		if (typeof o==='object' && o[p]) {
			return o[p];
		} 
		for (k in o) {
			if (o.hasOwnProperty(k)) {
				if (typeof o[k]==='object') {
					if (typeof found ==='undefined') {
						found = pfetch.call(this, o[k], p);						
					}
				}				
			}
		}			
		return found;
	};
	baseUtils.pfetch = pfetch;

	// What it does: given a property, or list of propertis, return the value of the first hit
	// note 1: if o is an Array, delegate to 'find' which operates on Arrays
	// note: owner flag suppresses return of #text value; give the owning object to caller
	var fetch = function (o, p, owner) {
		var i
			, keys = []
			, value;

		// convert p or list of p to Array for iteration
		if (_.isArray(p)) {
			keys = p;
		} else {
			for (i=1; i<arguments.length;i+=1) { keys.push(arguments[i]); }
		}
		
		if (o) {
			if (_.isArray(o)) {
				return find(o, p);
			}
			for (i=0; i<keys.length; i += 1) {
				value = pfetch(o, keys[i]);
				if (typeof value !== 'undefined' && owner === true) {
					return value;
				} 
				if (typeof value !== 'undefined') {
					return ((value && _.isObject(value) && value['#text']) || value) ;
				}
			}
		}
	};
	baseUtils.fetch = fetch;

	// What it does: takes item 'p1/p2/../pN' or 'p1.p2.p3' and searches for occurence of 
	// pN in pN-1
	var hfetch = function (o, item) {
		var splitChar = item.split('.').length > 0 ? '.' : '/'
			, items = _.compact(item.split(splitChar))
			, found = o;
		if (items.length > 1) {
			items.forEach(function(tag) {
				found = fetch(found, tag);
			});
			return found;					
		}
		return fetch(o, item);
	};
	baseUtils.hfetch = hfetch;


	
	// Purpose: Iterator for traversing abstract JSON objects; calls the supplied 'action' function
	var walk = function(obj, action, d) {
		var name
			, meta = _.clone(d) || { 'path': '', 'depth': 0}
			, path = meta.path;

		// terminates when called with a terminal element
		if (typeof obj === 'object') {
			for (name in obj) {
				// visit this object
				if (obj.hasOwnProperty(name)) {
					meta.path = path + name;
					action(obj, name, meta.path);

					if (typeof obj[name] === 'object' && meta.depth < 1000) {
						meta.depth += 1;
						meta.path += '/';
						this.walk(obj[name], action, meta);
					} else if (meta.depth === 1000) {
						throw '[ base-utils: walk() ] - nested object depth 1000 exceeded';
					}
				}
			}
		}
	};
	baseUtils.walk = walk;

	// Purpose: html string builder
	var buildHTML = function(tag, html, attrs) {
		var attr;
		// you can skip html param
		if (typeof(html) !== 'string') {
			attrs = html;
			html = null;
		}

		var h = '<' + tag;
		for (attr in attrs) {
			if (attrs.hasOwnProperty(attr) && attrs[attr] !== false && attrs[attr] !== undefined) { 
					h += ' ' + attr + '="' + attrs[attr] + '"';
			}
		}
		h += html ? ">" + html + "</" + tag + ">": "/>";
		//	console.log('buildHTML:', h);
		return h;
	};
	baseUtils.buildHTML = buildHTML;

	// Purpose: execute a function afer a set time in seconds.
	var wait = function (seconds, func) {
		var ms = seconds * 1000;	// converting to milli seconds
		setTimeout(function() {
			if (func && typeof func === 'function') {
				func();
			}
		}, ms);
	};
	baseUtils.wait = wait;
	
	// Purpose: Compute the memory used by the application. Note: Works for Node.js
	var memory = function() {
		if (typeof exports !== 'undefined') {
			return (require('util')
				.inspect(process.memoryUsage().rss/1024000));
		};
	};
	baseUtils.memory = memory;
	
	if (typeof Backbone !== 'undefined') {
		var events = function(Obj) {
			return _.extend(Obj || {}, _.clone(Backbone.Events));
		};
		baseUtils.events = events;	
	}

	// make these utilities available from Underscore.js
	_.mixin(baseUtils);
	
}());
/*
Serialize, formatJson: http://blog.stchur.com/2007/04/06/serializing-objects-in-javascript/
works differently than JSON.stringify. Why? JSON.stringify won't convert functions.

*/

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global  _: true*/

if (typeof _ === 'undefined') {
	if (typeof exports !== 'undefined') {
		var _ = require('underscore');
	} else {
		var _ = {};
		_.mixin = function(object) {
			var property;
			for (property in object) {
				if (object.hasOwnProperty(property)) {
					_[property] = object[property];
				}
			}
		}
	}
}

(function() {
	"use strict";
	var formatjs = {};
	
	// Borrowed: http://blog.stchur.com/2007/04/06/serializing-objects-in-javascript/
	// works differently than JSON.stringify. Why? JSON.stringify won't convert functions.
	formatjs.Serialize = function (thsobj) {
		var result;

		var serialize = function () {
			switch (typeof thsobj) {
				// numbers, booleans, and functions are trivial:
				// just return the object itself since its default .toString()
				// gives us exactly what we want
				case 'number':
				case 'boolean':
				case 'function':
					return thsobj;

				// for JSON format, strings need to be wrapped in quotes
				case 'string':
					return '\'' + thsobj + '\'';

				case 'object':
				var str;
				if (thsobj.constructor === Array || typeof thsobj.callee !== 'undefined')
				{
					str = '[';
					var i, len = thsobj.length;
					for (i = 0; i < len-1; i+=1) { str += serialize(thsobj[i]) + ','; }
					str += serialize(thsobj[i]) + ']';
				}
				else
				{
					str = '{';
					var key;
					for (key in thsobj) { 
						if (thsobj.hasOwnProperty(key)) {
							str += key + ':' + serialize(thsobj[key]) + ',';
						}
					}
					str = str.replace(/\,$/, '') + '}';
				}
				return str;

				default:
					return 'UNKNOWN';
			}
		};
		result = serialize();
		return result.toString();
	};

	formatjs.formatJson = function (val) {
		var retval = ''
			, str = val
			, pos = 0
			, strLen = str && str.length
			, indentStr = '&nbsp;&nbsp;&nbsp;&nbsp;'
			, newLine = '<br />'
			, char = ''
			, i
			, k
			, j;

		for (i=0; i<strLen; i+=1) {
			char = str.substring(i,i+1);

			if (char === '}' || char === ']') {
				retval = retval + newLine;
				pos = pos - 1;
				for (j=0; j<pos; j+=1) {
					retval = retval + indentStr;
				}
			}
			retval = retval + char;
			if (char === '{' || char === '[' || char === ',') {
				retval = retval + newLine;
				if (char === '{' || char === '[') {
					pos = pos + 1;
				}
				for (k=0; k<pos; k+=1) {
					retval = retval + indentStr;
				}
			}
		}
		return retval;
	};

	_.mixin(formatjs);
}());
/*
sprintf() for JavaScript 0.7-beta1
http://www.diveintojavascript.com/projects/javascript-sprintf

Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of sprintf() for JavaScript nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL Alexandru Marasteanu BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


Changelog:
2010.09.06 - 0.7-beta1
  - features: vsprintf, support for named placeholders
  - enhancements: format cache, reduced global namespace pollution

2010.05.22 - 0.6:
 - reverted to 0.4 and fixed the bug regarding the sign of the number 0
 Note:
 Thanks to Raphael Pigulla <raph (at] n3rd [dot) org> (http://www.n3rd.org/)
 who warned me about a bug in 0.5, I discovered that the last update was
 a regress. I appologize for sprintfUtils

2010.05.09 - 0.5:
 - bug fix: 0 is now preceeded with a + sign
 - bug fix: the sign was not at the right position on padded results (Kamal Abdali)
 - switched from GPL to BSD license

2007.10.21 - 0.4:
 - unit test and patch (David Baird)

2007.09.17 - 0.3:
 - bug fix: no longer throws exception on empty paramenters (Hans Pufal)

2007.09.11 - 0.2:
 - feature: added argument swapping

2007.04.03 - 0.1:
 - initial release
*/

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global  _: true*/

if (typeof _ === 'undefined') {
	if (typeof exports !== 'undefined') {
		var _ = require('underscore');
	} else {
		var _ = {};
		_.mixin = function(object) {
			var property;
			for (property in object) {
				if (object.hasOwnProperty(property)) {
					_[property] = object[property];
				}
			}
		}
	}
}

(function() {
	"use strict";
	var sprintfUtils = {};

	var sprintf = (function() {
		function get_type(variable) {
			return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
		}
		function str_repeat(input, multiplier) {
			var output;
			for (output = []; multiplier > 0; output[--multiplier] = input) {/* do nothing */}
			return output.join('');
		}

		var str_format = function() {
			if (!str_format.cache.hasOwnProperty(arguments[0])) {
				str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
			}
			return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
		};

		str_format.format = function(parse_tree, argv) {
			var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
			for (i = 0; i < tree_length; i++) {
				node_type = get_type(parse_tree[i]);
				if (node_type === 'string') {
					output.push(parse_tree[i]);
				}
				else if (node_type === 'array') {
					match = parse_tree[i]; // convenience purposes only
					if (match[2]) { // keyword argument
						arg = argv[cursor];
						for (k = 0; k < match[2].length; k++) {
							if (!arg.hasOwnProperty(match[2][k])) {
								throw(sprintf('[sprintf] property "%s" does not exist', match[2][k]));
							}
							arg = arg[match[2][k]];
						}
					}
					else if (match[1]) { // positional argument (explicit)
						arg = argv[match[1]];
					}
					else { // positional argument (implicit)
						arg = argv[cursor++];
					}

					if (/[^s]/.test(match[8]) && (get_type(arg) != 'number')) {
						throw(sprintf('[sprintf] expecting number but found %s', get_type(arg)));
					}
					switch (match[8]) {
						case 'b': arg = arg.toString(2); break;
						case 'c': arg = String.fromCharCode(arg); break;
						case 'd': arg = parseInt(arg, 10); break;
						case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
						case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
						case 'o': arg = arg.toString(8); break;
						case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
						case 'u': arg = Math.abs(arg); break;
						case 'x': arg = arg.toString(16); break;
						case 'X': arg = arg.toString(16).toUpperCase(); break;
					}
					arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
					pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
					pad_length = match[6] - String(arg).length;
					pad = match[6] ? str_repeat(pad_character, pad_length) : '';
					output.push(match[5] ? arg + pad : pad + arg);
				}
			}
			return output.join('');
		};

		str_format.cache = {};

		str_format.parse = function(fmt) {
			var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
			while (_fmt) {
				if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
					parse_tree.push(match[0]);
				}
				else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
					parse_tree.push('%');
				}
				else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
					if (match[2]) {
						arg_names |= 1;
						var field_list = [], replacement_field = match[2], field_match = [];
						if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
							field_list.push(field_match[1]);
							while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
								if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
									field_list.push(field_match[1]);
								}
								else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
									field_list.push(field_match[1]);
								}
								else {
									throw('[sprintf] huh?');
								}
							}
						}
						else {
							throw('[sprintf] huh?');
						}
						match[2] = field_list;
					}
					else {
						arg_names |= 2;
					}
					if (arg_names === 3) {
						throw('[sprintf] mixing positional and named placeholders is not (yet) supported');
					}
					parse_tree.push(match);
				}
				else {
					throw('[sprintf] huh?');
				}
				_fmt = _fmt.substring(match[0].length);
			}
			return parse_tree;
		};

		return str_format;
	})();
	sprintfUtils.sprintf = sprintf;

	var vsprintf = function(fmt, argv) {
		argv.unshift(fmt);
		return sprintf.apply(null, argv);
	};
	sprintfUtils.vsprintf = vsprintf;
	
	_.mixin(sprintfUtils)

}());
/*
Carlo Zottman: https://github.com/carlo/jquery-base64
# jquery-base64

Rather simple jQuery'fication of
[Nick Galbreath's base64 string encoder](http://stringencoders.googlecode.com/svn-history/r210/trunk/javascript/base64.js).

I didn't like having a global `base64` variable around, that's all.


## Usage

* `$.base64.encode( "this is a test" )` returns `"dGhpcyBpcyBhIHRlc3Q="`
* `$.base64.decode( "dGhpcyBpcyBhIHRlc3Q=" )` returns `"this is a test"`


## Known issues

JSLint is complaining about the "unexpected use of '<<'/'|'".  No idea, suggestions welcome.


## Developers

Original code by [Nick Galbreath](http://stringencoders.googlecode.com/svn-history/r210/trunk/javascript/base64.js).
Port by [Carlo Zottmann](http://github.com/carlo).


## License

MIT license, just like [the original](http://stringencoders.googlecode.com/svn-history/r210/trunk/javascript/base64.js).


*/
/*global  _: true*/

if (typeof _ === 'undefined') {
	if (typeof exports !== 'undefined') {
		var _ = require('underscore');
	} else {
		var _ = {};
		_.mixin = function(object) {
			var property;
			for (property in object) {
				if (object.hasOwnProperty(property)) {
					_[property] = object[property];
				}
			}
		}
	}
}
"use strict";
(function () {
    var $,
		_PADCHAR = "=",
        _ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
        _VERSION = "1.0";

    function _getbyte64(s, i) {
        var idx = _ALPHA.indexOf(s.charAt(i));
        if (idx === -1) {
            throw new Error("Cannot decode base64");
        }
        return idx
    }

    function _decode(s) {
        var pads = 0,
            i, b10, imax = s.length,
            x = [];
        s = String(s);
        if (imax === 0) {
            return s
        }
        if (imax % 4 !== 0) {
            throw new Error ("Cannot decode base64");
        }
        if (s.charAt(imax - 1) === _PADCHAR) {
            pads = 1;
            if (s.charAt(imax - 2) === _PADCHAR) {
                pads = 2
            }
            imax -= 4
        }
        for (i = 0; i < imax; i += 4) {
            b10 = (_getbyte64(s, i) << 18) | (_getbyte64(s, i + 1) << 12) | (_getbyte64(s, i + 2) << 6) | _getbyte64(s, i + 3);
            x.push(String.fromCharCode(b10 >> 16, (b10 >> 8) & 255, b10 & 255))
        }
        switch (pads) {
        case 1:
            b10 = (_getbyte64(s, i) << 18) | (_getbyte64(s, i + 1) << 12) | (_getbyte64(s, i + 2) << 6);
            x.push(String.fromCharCode(b10 >> 16, (b10 >> 8) & 255));
            break;
        case 2:
            b10 = (_getbyte64(s, i) << 18) | (_getbyte64(s, i + 1) << 12);
            x.push(String.fromCharCode(b10 >> 16));
            break
        }
        return x.join("")
    }

    function _getbyte(s, i) {
        var x = s.charCodeAt(i);
        if (x > 255) {
            throw new Error("INVALID_CHARACTER_ERR: DOM Exception 5 ("+x+")");
        }
        return x
    }

    function _encode(s) {
        if (arguments.length !== 1) {
            throw new Error("SyntaxError: exactly one argument required");
        }
        s = String(s);
        var i, b10, x = [],
            imax = s.length - s.length % 3;
        if (s.length === 0) {
            return s
        }
        for (i = 0; i < imax; i += 3) {
            b10 = (_getbyte(s, i) << 16) | (_getbyte(s, i + 1) << 8) | _getbyte(s, i + 2);
            x.push(_ALPHA.charAt(b10 >> 18));
            x.push(_ALPHA.charAt((b10 >> 12) & 63));
            x.push(_ALPHA.charAt((b10 >> 6) & 63));
            x.push(_ALPHA.charAt(b10 & 63))
        }
        switch (s.length - imax) {
        case 1:
            b10 = _getbyte(s, i) << 16;
            x.push(_ALPHA.charAt(b10 >> 18) + _ALPHA.charAt((b10 >> 12) & 63) + _PADCHAR + _PADCHAR);
            break;
        case 2:
            b10 = (_getbyte(s, i) << 16) | (_getbyte(s, i + 1) << 8);
            x.push(_ALPHA.charAt(b10 >> 18) + _ALPHA.charAt((b10 >> 12) & 63) + _ALPHA.charAt((b10 >> 6) & 63) + _PADCHAR);
            break
        }
        return x.join("")
    }
    _.mixin ({
        decode: _decode,
        encode: _encode,
        VERSION: _VERSION
    });

}());/* ===================================================
 * js-url.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global _: true */

/*global  _: true*/

if (typeof _ === 'undefined') {
	if (typeof exports !== 'undefined') {
		var _ = require('underscore');
	} else {
		var _ = {};
		_.mixin = function(object) {
			var property;
			for (property in object) {
				if (object.hasOwnProperty(property)) {
					_[property] = object[property];
				}
			}
		}
	}
}

(function() {
	"use strict";
	var urlUtils = {};
	
	// What it does: helper to convert a URL into a valid docId
	var url2Id = function (host, reverse) {

		if (reverse && typeof host === 'string') {
			return(host.replace(/-/g, '.'));
		}
		if (host.indexOf('http://') === -1) {				
			return(_.urlParse('http://' + host).host.replace(/\./g, '-'));
		}
		return(_.urlParse(host).host.replace(/\./g, '-'));
	};
	urlUtils.url2Id = url2Id;
	
	var urlFormat = function (source) {
		var target = '';

		if (source) {
			target = source.protocol ? source.protocol + '//' : '';
			target = target + (source.auth ? source.auth + '@' : '');
			target = target + (source.host || (source.hostname || ''));
			target = target + (source.path || '');
			target = target + (source.hash || '');
		}
		return target;
	};
	urlUtils.urlFormat = urlFormat;

	var formatQuery = function (source) {
		var target = '?';

		_.each(source, function(value, name) {
			target += name + '=' + value + '&';
		});

		// clip the trailing '&'
		return (target.slice(0,target.length-1));
	};
	urlUtils.formatQuery = formatQuery;

	var parseQuery = function (queryString) {
		var qs = queryString || '';

		var tmp = qs.charAt(0) === '?' ? qs.slice(1).toLowerCase() : qs.toLowerCase()
			, qryobj = {};			

		tmp.split('&').forEach(function(pair) {
			if (pair.split('=').length > 1) {
				qryobj[pair.split('=')[0]] = pair.split('=')[1] || '';					
			}
		});
		return qryobj;	
	};
	urlUtils.parseQuery = parseQuery;

	var urlParse = function (url, query, slashes) {
		/*jslint sub: true */
		var tmpurl = (url && url.toLowerCase()) || ''
			, thisurl = _.extend({}, { 'href': url || '', 'path': '' })
			, segment;

		if (tmpurl.split('#').length > 1) {
			tmpurl.split('#').forEach(function() {
				thisurl.hash = '#' + url.split('#')[1];
			});				
		}

		if (tmpurl.split('?').length > 1) {
			tmpurl.split('?').forEach(function() {
				thisurl.search = '?' + url.split('?')[1].split('#')[0];
			});				
		}

		// http, https, ftp, gopher, file
		segment = tmpurl.split('//')[0].substr(0,3);
		if (segment === 'htt' || segment === 'ftp' || segment === 'gop' || segment === 'fil') {
			thisurl.protocol = tmpurl.split('/')[0];
		}

		// 'http://user:pass@host.com:8080/p/a/t/h?query=string#hash'
		// 'http://www.example.com/a/b 
		// www.example.com
		// /a/b/c
		tmpurl.split('/').forEach(function(segment) {
			if (segment.split('@').length > 1) {
				thisurl.auth = segment.split('@')[0];
			}
		});

		if (tmpurl.split('//').length > 1) {
			segment = tmpurl.split('//')[1].split('/')[0];
			if (segment.split('@').length > 1) {
				thisurl.host = segment.split('@')[1];
			} else {
				thisurl.host = segment;
			}				
		}

		if (thisurl.host && thisurl.host.search(':') !== -1) {
			thisurl.hostname = thisurl.host.split(':')[0];
			thisurl.port = thisurl.host.split(':')[1] || '';
		}

		if (thisurl.host) {
			thisurl.path = 
			tmpurl.substr(tmpurl.search(thisurl.host)+thisurl.host.length);
		} else {
			thisurl.path = tmpurl;
		}

		thisurl.pathname = thisurl.path.split('?')[0];
		thisurl.path = thisurl.pathname + (thisurl.search || '');

		if (query && query === true && thisurl.search) {
			thisurl['query'] = parseQuery(thisurl['search']);
		} else {
			if (thisurl.hasOwnProperty('search')) {
				thisurl['query'] = thisurl['search'].slice(1);					
			}
		}
		if (slashes && slashes === true) {
			throw new Error ('slashes is not supported in url() object.');
		}
		return thisurl;
	};
	urlUtils.urlParse = urlParse;
	
	// make these utilities available from Underscore.js
	_.mixin(urlUtils);

}())

/* ===================================================
 * date-utils.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global _: true */

/*global  _: true*/

if (typeof _ === 'undefined') {
	if (typeof exports !== 'undefined') {
		var _ = require('underscore');
	} else {
		var _ = {};
		_.mixin = function(object) {
			var property;
			for (property in object) {
				if (object.hasOwnProperty(property)) {
					_[property] = object[property];
				}
			}
		}
	}
}


(function() {
	"use strict";
	var dateUtils = {};

	var date = function(o) {
		var that = o || {}
		, map = {
			'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
			'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
		}
		, formats = [
			'dd/mm/yyyy', 'mm/dd/yyyy', 'yyyy/mm/dd', 'yyyy/dd/mm',
			'dd-mm-yyyy', 'mm-dd-yyyy', 'yyyy-mm-dd', 'yyyy-dd-mm',
			'mm-yyyy', 'mm yyyy', 'mm/yyyy', 'mm dd yyyy', 'yyyy mm dd', 'day yyyy mm dd' ]
		, separator
		, template = function (v) {
			var obj = v || this.dateValue;

			return({
				'yyyy': obj.getFullYear(),
				'mm': obj.getMonth(),
				'dd': obj.getDate(),
				'day': obj.getDay(),
				'time': obj.toTimeString().split(' ')[0]				
			});
		};
		that.template = template;

//console.log('making date for', that.dateIn);
		// if no dateIn supplied, use the system date and proper format;
		if (!that.dateIn)  {
			that.format = 'day yyyy mm dd';
			that.dateValue = new Date();
			that.dateIn = that.dateValue.toString();
		} else if (_.isArray(that.dateIn)) {
			that.format = (o && o.format) || 'yyyy mm dd';
			that.dateValue = new Date(_.map(that.dateIn, function(x) { return _.toInt(x); }));
			that.dateValue.setMonth(that.dateValue.getMonth()+1);
		} else if (_.isObject(that.dateIn)) {
			that.dateValue = that.dateIn;
			that.format = 'yyyy mm dd';
		} else {
			that.dateValue = new Date(that.dateIn);
			// if no format provided, then date object will think month is zero-based and decrement
			// application must adapt
			if (!that.format) {
				that.dateValue.setMonth(that.dateValue.getMonth()+1);				
			}
			that.format = (o && o.format) || 'yyyy mm dd';
		}
		// check that application supplied a valid date
		if (_.fetch(formats, that.format) === -1) {
			throw new Error ('date(): Unrecognized date format ' + that.format);
		}

		// get the separator for the date format
		var getSeparator = function (f) {
			var separator
				, temp = [];
			[ '/', '-', ' '].forEach(function(sep) {
				if (temp.length < 2) {
					separator = sep;
					temp = f.split(separator);
				}
			});
			return separator;				
		};
		// get the format separator character
		separator = getSeparator(that.format);

		// What it does: method to return a date as an array [yyyy, mm, dd ] .concat([ time ])
		var key = function (f) {
			var fmt = f || this.format
			, sepchar = getSeparator(fmt)
			, local = this;

			return _.map((fmt || 'yyyy mm dd').split(sepchar), function(part) {
				return local.template()[part];
			});
		};
		that.key = key;

		// What it does: Joins the value of 'today' using deciphered 'separator' to form
		// the date format string. And, reformats numeric 'mm' to string
		var print = function (format) {
			return(this.key(format).join(getSeparator((format || this.format))));
		};
		that.print = print;

		var docId = function () {
			return(this.print('time-yyyy-mm-dd'));
		};
		that.docId = docId;

		// What it does: takes month string and returns an ordinal integer value. If none provided,
		// returns the value of the month for this object
		var m2n = function (monthStr) {
			var mon = (monthStr && monthStr.toLowerCase());
			return _.isString(mon) && (map[mon] || map[mon.substr(0,3)]);
		};
		that.m2n = m2n;

		// What it does: takes a number and returns a string month
		var n2m = function (monthNo) {
			var month
				, targetMonth = (monthNo || this.template().mm);

			for (month in map) {
			//	console.log('finding month in map', map[month], month, typeof month);
				if (map.hasOwnProperty(month) && (map[month]=== targetMonth)) {
					//console.log('returning month', month, typeof month);
					return month;					
				}
			}
			return targetMonth;
		};
		that.n2m = n2m;

		var valueOf = function () {
			return this.dateValue.valueOf();
		};
		that.valueOf = valueOf;

		var setTime = function(v) {
			this.dateValue = new Date();
			this.dateValue.setTime(v);
			return this;
		};
		that.setTime = setTime;

		// what it does: returns the 'today' value using the place in template for date 'part' 
		var getPart = function (part) {
			return this.template()[part];
		};
		that.getPart = getPart;

		var getYear = function () {
			return this.getPart('yyyy');
		};
		that.getYear = getYear;

		var getMonth = function () {
			return this.getPart('mm');
		};
		that.getMonth = getMonth;

		var getDate = function () {
			return this.getPart('dd');
		};
		that.getDate = getDate;

		var setYear = function (val) {
			this.dateValue.setFullYear(_.toInt(val));
			return this;
		};
		that.setYear = setYear;

		var setMonth = function (val) {
			this.dateValue.setMonth(_.toInt(val));
			return this;
		};
		that.setMonth = setMonth;

		var setDate = function (val) {
			this.dateValue.setDate(_.toInt(val));
			return this;
		};
		that.setDate = setDate;

		var gt = function (d2) {
			return this.valueOf() > d2.valueOf();
		};
		that.gt = gt;

		var lt = function (d2) {
			return !this.gt(d2);		
		};
		that.lt = lt;

		var le = function (d2) {
			return ((!this.gt(d2)) || this.eq(d2));		
		};
		that.le = le;

		var ge = function (d2) {
			return ((this.gt(d2)) || this.eq(d2));		
		};
		that.ge = ge;

		var eq = function (d2) {
			return this.valueOf() === d2.valueOf();
		};
		that.eq = eq;

		var inRange = function (start, end) {
			return (this.ge(start) && this.le(end));
		};
		that.inRange = inRange;
		return that;		
	};
	dateUtils.date = date;
	
	// returns a boxspring.js date object from an array [yyyy, mm, dd]
	var toDate = function(d) {
		return _.date({'dateIn': d });
	};
	dateUtils.toDate = toDate;
	
	// make these utilities available from Underscore.js
	_.mixin(dateUtils);
	
}());




/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */

/*global  _: true*/

if (typeof _ === 'undefined') {
	if (typeof exports !== 'undefined') {
		var _ = require('underscore');
	} else {
		var _ = {};
		_.mixin = function(object) {
			var property;
			for (property in object) {
				if (object.hasOwnProperty(property)) {
					_[property] = object[property];
				}
			}
		}
	}
}

(function(global) {
	"use strict";
	
	var Tree = function(obj) {
		var items;
		
		for (items in obj) {
			if (obj.hasOwnProperty(items)) {
				this[items] = obj[items];				
			}
		}
		this.child = undefined;
		this.sibling = undefined;
		this.owner = undefined;
		return this;
	};
	
	
	Tree.prototype.addChild = function (obj) {
		return this.insertChild(new Tree(obj));
	};

	Tree.prototype.firstChild = function () {
		return this.child;
	};

	Tree.prototype.nextSibling = function () {
		return this.sibling;
	};
	Tree.prototype.lastSibling = function () {
		var sib = ((this && this.sibling) || this)
		, LIMIT = 1000000
		, counter = 0;
		
		while ((sib && sib.sibling) && counter < LIMIT) {
			sib = sib.sibling;
		}
		if (counter === LIMIT) {
			throw new Error('Tree: cycle encountered');
		}
		return sib;
	};
	Tree.prototype.lastChild = function () {
		return this.firstChild() && this.firstChild().lastSibling();
	};
	Tree.prototype.parent = function () {
		return this.owner;
	};
	Tree.prototype.firstSibling = function () {
		return this.parent() && this.parent().firstChild();		
	};
	Tree.prototype.previousSibling = function () {
		var predecessor = this.firstSibling();
		while (predecessor && predecessor.sibling && predecessor.sibling !== this) {
			predecessor = predecessor.sibling;
		}
		return predecessor;
	};
	Tree.prototype.grandParent = function () {
		return (this.parent() && this.parent().parent());
	};
	// What it does: fetches the last sibling from the objects children and inserts child at the end.
	Tree.prototype.insertChild = function (child) {
		var lastChild = this.lastChild();

		// case 1: no first child, just add the child
		if (!this.firstChild()) {
			child.sibling = undefined;
			child.owner = undefined;
			return this.insertFirstChild(child);
		}
		// case 2: fetch last child and add this to the end
		try {
			lastChild.sibling = child;
			child.owner = lastChild.owner;
			child.sibling = undefined;				
		} catch (e) {
			throw new Error('Tree.insertChild(): lastChild wrong!');
		}
		return this;
	};
	
	// insert an element as the first child of a parent; previous first child is sibling of new
	Tree.prototype.insertFirstChild = function (child) {
		if (child) {
			if (this && this.child) {
				child.sibling = this.child;
			} else {
				child.sibling = undefined;					
			}
			this.child = child;
			child.owner = this;
		}
		return this;				
	};

	// insert an element as a sibling of this element
	Tree.prototype.spliceIn = function (sib) {
		if (sib) {
			sib.sibling = this.sibling;
			this.sibling = sib;
			sib.owner = this.owner;
		}
		return sib;
	};

	// remove a sibling from a Tree of siblings
	Tree.prototype.spliceOut = function () {
		var location = this && this.parent() && this.parent().firstChild()
		, owner = this && this.parent();

		// only child
		if (this === location && !this.sibling) {
			this.owner.child = undefined;
			this.owner = undefined;
			return undefined;
		}
		// first child with siblings
		if (this === location && this.sibling) {
			this.owner.child = this.sibling;
			this.owner = undefined;
			this.sibling = undefined;
			return owner.firstChild();
		}
		// middle child or end child
		while (location && location.sibling && location.sibling !== this) { 
			location = location.sibling; 
		}
		location.sibling = this.sibling;
		this.owner = undefined;
		this.sibling = undefined;
		return location;
	};

	Tree.prototype.siblings = function (it) {
		var result = [] 
		, next = (this && this.owner && this.owner.child)
		, iterator = (((typeof it === 'function') && it) || function () { return true; });

		while (next) {
			if (iterator(next) === true) {
				result.push(next);						
			}
			next = next.sibling;					
		}
		return result;
	};	

	Tree.prototype.each = function () {
		var result = [];

		this.walk(function() {
			result.push(this);
		});
		return result;
	};

	Tree.prototype.walk = function(fn) {			
		if (typeof fn !== 'function') {
			throw new Error('Tree.walk(): You must supply a function to the Tree walk method.');				
		}
		// visit this node
		fn.call(this, this);
		if (this && this.child) {
			// its child
			this.child.walk(fn);
		}
		if (this && this.sibling) {
			this.sibling.walk(fn);
		}
	};

	Tree.prototype.find = function(id, fn) {
		var local = this
			, found;

		// the empty argument Tree returns the id of self	
		if (arguments.length === 0) {
			return this.id;
		}

		this.walk(function(item) {
			if (item.id === id) {
				if (fn && typeof fn === 'function') {
					fn.call(local, item);
				} else {
					found = item;
				}
			}
		});
		return found;
	};
	Tree.prototype.Id = Tree.prototype.find;
	
	var tree = function (o) {
		return new Tree(o);
	};

	// make these utilities available from Underscore.js
	_.mixin({'tree': tree });
	
}());

/* ===================================================
 * JS-Hash.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global  _: true*/

if (typeof _ === 'undefined') {
	if (typeof exports !== 'undefined') {
		_ = require('underscore');
	} else {
		_ = {};
		_.mixin = function(object) {
			var property;
			for (property in object) {
				if (object.hasOwnProperty(property)) {
					_[property] = object[property];
				}
			}
		}
	}
}

(function(global) {
	"use strict";
	
	var Hash = function(init) {
		var item
		, newItem;
		this._attributes = {};
		this._original = {};
		
		for (item in init) {
			if (init.hasOwnProperty(item)) {
				this._attributes[item] = this._original[item] = init[item];
			}
		}
		return this;		
	};

	Hash.prototype.get = function (name) {			
		return this._attributes && this._attributes[name];
	};
	Hash.prototype.lookup = Hash.prototype.get;
	Hash.prototype.find = Hash.prototype.get;

	Hash.prototype.contains = function (name) {
		return (typeof this.get(name) !== 'undefined');
	};

	Hash.prototype.attributes = function (v) {
		if (v) {
			this._attributes = v;
		}
		return this._attributes;
	};
	Hash.prototype.post = Hash.prototype.attributes;

	Hash.prototype.getLength = function () {
		var k
		, count = 0;

		for (k in this._attributes) {
			if (this._attributes.hasOwnProperty(k)) {
				count += 1;				
			}
		}
		return count;
	};

	// What it does: Remove an item from the Hash
	Hash.prototype.remove = function (name) {
		if (this._attributes[name]) {
			delete this._attributes[name];
		}
		return this;
	};
	// What it does: Return the Hash as an array so it can be used as an argument to map/reduce
	Hash.prototype.each = function () {
		var objectArray = []
		, obj;

		for (obj in this._attributes) {
			if (this._attributes.hasOwnProperty(obj)) {
				objectArray.push([obj, this._attributes[obj]]);				
			}
		}
		return objectArray;
	};

	Hash.prototype.keys = function () {
		var keyArray = []
		, obj;

		for (obj in this._attributes) {
			if (this._attributes.hasOwnProperty(obj)) {
				keyArray.push(obj);				
			}
		}
		return keyArray;
	};

	Hash.prototype.first = function () {
		return(this.get(this.keys()[0]));		
	};
	
	// What it does: Bulk update the properties of the Hash
	Hash.prototype.update = function (properties) {
		var property;
		
		for (property in properties) {
			if (properties.hasOwnProperty(property)) {
				this.set(property, properties[property]);
			}
		}
		return this;		
	};
	
	Hash.prototype.set = function (name, value) {
		var property;
		
		if (typeof name === 'object') {
			for (property in name) {
				if (name.hasOwnProperty(property)) {
					this.set(property, name[property]);
				}
			}			
		} else {
			this._attributes[name] = value;			
		}
		return this;
	};
	Hash.prototype.store = Hash.prototype.set;
	
	// What it does: Returns an object containing only the selected items. args can be an Array of strings
	// or separate argument strings
	Hash.prototype.pick = function (args) {
		var i
		, list = []
		, target = {};
		
		// accepts arguments as either array of items to pick, or argument list of items
		if (typeof args === 'string') {
			// convert the arguments list to an array
			for (i=0; i < arguments.length; i += 1) {
				list.push(arguments[i]);
			}
		} else {
			// or, just use as is
			list = args;
		}
		// iterate over the arguments to pick up the items requested
		for (i=0; i < list.length; i += 1) {
			target[list[i]] = this.get(list[i]);
		}
		return target;
	};
	// What it does: Returns the object values to its original state
	Hash.prototype.restore = function () {
		var item;
		
		for (item in this._attributes) {
			if (this._attributes.hasOwnProperty(item)) {
				this._attributes[item] = undefined;
			}
		}
		for (item in this._original) {
			if (this._original.hasOwnProperty(item)) {
				this._attributes[item] = this._original[item];
			}
		}
		return this;
	};
	
	Hash.prototype.empty = function () {
		return this.post({});
	};
	
	var hash = function (o) {
		return new Hash(o);
	};

	// make these utilities available from Underscore.js
	global.mixin({'hash': hash });
	
}(_));


if (typeof exports !== 'undefined') {
	exports._ = _;
} 
/* ===================================================
 * js-queue.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global  _: true*/

if (typeof _ === 'undefined') {
	if (typeof exports !== 'undefined') {
		var _ = require('underscore');
	} else {
		var _ = {};
		_.mixin = function(object) {
			var property;
			for (property in object) {
				if (object.hasOwnProperty(property)) {
					_[property] = object[property];
				}
			}
		}
	}
}

(function(global) {
	"use strict";
	
	var Queue = function() {
		this.Pending = [];
		this.Running = [];
		this.cleared = false;
		this.hold = false;
		this.afterFunc = function () { return; };
		this.afterFuncArgs = [];
		this.depth = 1;
		return this;		
	};
	
	Queue.prototype.submit = function (func) {
		var i
		, args = [];
		// any arguments to submit after func are the arguments to func. Conver them to array.
		for (i=1; i < arguments.length; i += 1) {
			args.push(arguments[i]);
		}
		// the queue will dequeue func with argument args
		this.Pending.push({ 'func': func, 'args': args });
		return this;		
	};

	// What it does: Called by the application to start the queue running. 
	// cycle method continuously calls it while there are still jobs pending.
	Queue.prototype.run = function () {
		var nextJob = {};

		if (this.hold === true) { return; }
		if ((this.Pending.length > 0) // remaining jobs
				&& (this.Running.length < this.depth)) { // more capacity available
			this.Running.push({});
			this.cycle();
			nextJob = this.Pending.shift();
			try {
				nextJob.func.apply(this, nextJob.args);
			} catch (e) {
				throw new Error('Queue.run(): Failed executing next job.');
			}
		} 
		return this;
	};

	// What it does: We need some space between the last dequeue and the next attempt to run a job; or else
	// we can get a race.
	Queue.prototype.cycle = function () {
		var local = this;
		
		setTimeout(function () {
			local.run();
			if (local.Pending.length > 0) { 
				local.cycle(); 
			}
		}, 100);
	};
	// What this does: Called by the application when the job finishes. If the queue is empty, 
	// run the 'afterFunc', if one was supplied.
	Queue.prototype.finish = function () {
		this.Running.pop();
		if (this.Pending.length === 0 && this.Running.length === 0) {
			this.afterFunc.apply(this, this.afterFuncArgs);
		}
		return this;		
	};
	
	Queue.prototype.max = function (depth) {
		if (depth) {
			this.depth = parseInt(depth, 10);
		}
		return this;		
	};

	Queue.prototype.after = function (func, args) {
		if (func && typeof func === 'function') {
			this.afterFunc = func;
			this.afterFuncArgs = args;
		}
		return this;
	};

	Queue.prototype.suspend = function () {
		this.hold = true;
		return this;
	};
	
	Queue.prototype.resume = function () {
		this.hold = false;
		return this;
	};
	
	Queue.prototype.pending = function () {
		return this.Pending.length;
	};
	
	Queue.prototype.running = function () {
		return this.Running.length;
	};
	
	Queue.prototype.clear = function () {
		while (this.Pending.length > 0) {
			this.Pending.pop();
		}
		this.cleared = true;
		this.afterFunc(this.afterFuncArgs);
		return this;		
	};

	var queue = function () {
		return new Queue();
	};

	// make these utilities available from Underscore.js
	_.mixin({'queue': queue });
	
}());

/* 
 *	Based on ObjTree.js from 
 *	Yusuke Kawasaki http://www.kawa.net/ 
 *
*/
/*global  _: true*/
if (typeof _ === 'undefined') {
	if (typeof exports !== 'undefined') {
		var _ = require('underscore');
	} else {
		var _ = {};
		_.mixin = function(object) {
			var property;
			for (property in object) {
				if (object.hasOwnProperty(property)) {
					_[property] = object[property];
				}
			}
		}
	}
}


// If running in Node.js, need package library 'xmldom'. 
// Provides the DOMParser object. Everything else stays the same!
if (typeof window === 'undefined') {
	var DOMParser = require('xmldom').DOMParser;	

	var window = {};
	window.DOMParser = true;
}

(function(global) {
	var XML;
	
	// ========================================================================
	//  XML.ObjTree -- XML source code from/to JavaScript object like E4X
	// ========================================================================
	if ( typeof(XML) == 'undefined' ) XML = function() {};

	//  constructor

	XML.ObjTree = function () {
	    return this;
	};

	//  class variables

	XML.ObjTree.VERSION = "0.24";

	//  object prototype

	XML.ObjTree.prototype.xmlDecl = '<?xml version="1.0" encoding="UTF-8" ?>\n';
	XML.ObjTree.prototype.attr_prefix = '-';
	XML.ObjTree.prototype.overrideMimeType = 'text/xml';

	//  method: parseXML( xmlsource )

	XML.ObjTree.prototype.parseXML = function ( xml ) {
	    var root;
	    if ( window.DOMParser ) {
	        var xmldom = new DOMParser();
	//      xmldom.async = false;           // DOMParser is always sync-mode
	        var dom = xmldom.parseFromString( xml, "application/xml" );
	        if ( ! dom ) return;
	        root = dom.documentElement;
	    } else if ( window.ActiveXObject ) {
	        xmldom = new ActiveXObject('Microsoft.XMLDOM');
	        xmldom.async = false;
	        xmldom.loadXML( xml );
	        root = xmldom.documentElement;
	    }
	    if ( ! root ) return;
	    return this.parseDOM( root );
	};

	//  method: parseHTTP( url, options, callback )

	XML.ObjTree.prototype.parseHTTP = function ( url, options, callback ) {
	    var myopt = {};
	    for( var key in options ) {
	        myopt[key] = options[key];                  // copy object
	    }
	    if ( ! myopt.method ) {
	        if ( typeof(myopt.postBody) == "undefined" &&
	             typeof(myopt.postbody) == "undefined" &&
	             typeof(myopt.parameters) == "undefined" ) {
	            myopt.method = "get";
	        } else {
	            myopt.method = "post";
	        }
	    }
	    if ( callback ) {
	        myopt.asynchronous = true;                  // async-mode
	        var __this = this;
	        var __func = callback;
	        var __save = myopt.onComplete;
	        myopt.onComplete = function ( trans ) {
	            var tree;
	            if ( trans && trans.responseXML && trans.responseXML.documentElement ) {
	                tree = __this.parseDOM( trans.responseXML.documentElement );
	            } else if ( trans && trans.responseText ) {
	                tree = __this.parseXML( trans.responseText );
	            }
	            __func( tree, trans );
	            if ( __save ) __save( trans );
	        };
	    } else {
	        myopt.asynchronous = false;                 // sync-mode
	    }
	    var trans;
	    if ( typeof(HTTP) != "undefined" && HTTP.Request ) {
	        myopt.uri = url;
	        var req = new HTTP.Request( myopt );        // JSAN
	        if ( req ) trans = req.transport;
	    } else if ( typeof(Ajax) != "undefined" && Ajax.Request ) {
	        var req = new Ajax.Request( url, myopt );   // ptorotype.js
	        if ( req ) trans = req.transport;
	    }
	//  if ( trans && typeof(trans.overrideMimeType) != "undefined" ) {
	//      trans.overrideMimeType( this.overrideMimeType );
	//  }
	    if ( callback ) return trans;
	    if ( trans && trans.responseXML && trans.responseXML.documentElement ) {
	        return this.parseDOM( trans.responseXML.documentElement );
	    } else if ( trans && trans.responseText ) {
	        return this.parseXML( trans.responseText );
	    }
	}

	//  method: parseDOM( documentroot )

	XML.ObjTree.prototype.parseDOM = function ( root ) {
	    if ( ! root ) return;

	    this.__force_array = {};
	    if ( this.force_array ) {
	        for( var i=0; i<this.force_array.length; i++ ) {
	            this.__force_array[this.force_array[i]] = 1;
	        }
	    }

	    var json = this.parseElement( root );   // parse root node
	    if ( this.__force_array[root.nodeName] ) {
	        json = [ json ];
	    }
	    if ( root.nodeType != 11 ) {            // DOCUMENT_FRAGMENT_NODE
	        var tmp = {};
	        tmp[root.nodeName] = json;          // root nodeName
	        json = tmp;
	    }
	    return json;
	};

	//  method: parseElement( element )

	XML.ObjTree.prototype.parseElement = function ( elem ) {
	    //  COMMENT_NODE
	    if ( elem.nodeType == 7 ) {
	        return;
	    }

	    //  TEXT_NODE CDATA_SECTION_NODE
	    if ( elem.nodeType == 3 || elem.nodeType == 4 ) {
	        var bool = elem.nodeValue.match( /[^\x00-\x20]/ );
	        if ( bool == null ) return;     // ignore white spaces
	        return elem.nodeValue;
	    }

	    var retval;
	    var cnt = {};

	    //  parse attributes
	    if ( elem.attributes && elem.attributes.length ) {
	        retval = {};
	        for ( var i=0; i<elem.attributes.length; i++ ) {
	            var key = elem.attributes[i].nodeName;
	            if ( typeof(key) != "string" ) continue;
	            var val = elem.attributes[i].nodeValue;
	            if ( ! val ) continue;
	            key = this.attr_prefix + key;
	            if ( typeof(cnt[key]) == "undefined" ) cnt[key] = 0;
	            cnt[key] ++;
	            this.addNode( retval, key, cnt[key], val );
	        }
	    }

	    //  parse child nodes (recursive)
	    if ( elem.childNodes && elem.childNodes.length ) {
	        var textonly = true;
	        if ( retval ) textonly = false;        // some attributes exists
	        for ( var i=0; i<elem.childNodes.length && textonly; i++ ) {
	            var ntype = elem.childNodes[i].nodeType;
	            if ( ntype == 3 || ntype == 4 ) continue;
	            textonly = false;
	        }
	        if ( textonly ) {
	            if ( ! retval ) retval = "";
	            for ( var i=0; i<elem.childNodes.length; i++ ) {
	                retval += elem.childNodes[i].nodeValue;
	            }
	        } else {
	            if ( ! retval ) retval = {};
	            for ( var i=0; i<elem.childNodes.length; i++ ) {
	                var key = elem.childNodes[i].nodeName;
	                if ( typeof(key) != "string" ) continue;
	                var val = this.parseElement( elem.childNodes[i] );
	                if ( ! val ) continue;
	                if ( typeof(cnt[key]) == "undefined" ) cnt[key] = 0;
	                cnt[key] ++;
	                this.addNode( retval, key, cnt[key], val );
	            }
	        }
	    }
	    return retval;
	};

	//  method: addNode( hash, key, count, value )

	XML.ObjTree.prototype.addNode = function ( hash, key, cnts, val ) {
	    if ( this.__force_array[key] ) {
	        if ( cnts == 1 ) hash[key] = [];
	        hash[key][hash[key].length] = val;      // push
	    } else if ( cnts == 1 ) {                   // 1st sibling
	        hash[key] = val;
	    } else if ( cnts == 2 ) {                   // 2nd sibling
	        hash[key] = [ hash[key], val ];
	    } else {                                    // 3rd sibling and more
	        hash[key][hash[key].length] = val;
	    }
	};

	//  method: writeXML( tree )

	XML.ObjTree.prototype.writeXML = function ( tree ) {
	    var xml = this.hash_to_xml( null, tree );
	    return this.xmlDecl + xml;
	};

	//  method: hash_to_xml( tagName, tree )

	XML.ObjTree.prototype.hash_to_xml = function ( name, tree ) {
	    var elem = [];
	    var attr = [];
	    for( var key in tree ) {
	        if ( ! tree.hasOwnProperty(key) ) continue;
	        var val = tree[key];
	        if ( key.charAt(0) != this.attr_prefix ) {
	            if ( typeof(val) == "undefined" || val == null ) {
	                elem[elem.length] = "<"+key+" />";
	            } else if ( typeof(val) == "object" && val.constructor == Array ) {
	                elem[elem.length] = this.array_to_xml( key, val );
	            } else if ( typeof(val) == "object" ) {
	                elem[elem.length] = this.hash_to_xml( key, val );
	            } else {
	                elem[elem.length] = this.scalar_to_xml( key, val );
	            }
	        } else {
	            attr[attr.length] = " "+(key.substring(1))+'="'+(this.xml_escape( val ))+'"';
	        }
	    }
	    var jattr = attr.join("");
	    var jelem = elem.join("");
	    if ( typeof(name) == "undefined" || name == null ) {
	        // no tag
	    } else if ( elem.length > 0 ) {
	        if ( jelem.match( /\n/ )) {
	            jelem = "<"+name+jattr+">\n"+jelem+"</"+name+">\n";
	        } else {
	            jelem = "<"+name+jattr+">"  +jelem+"</"+name+">\n";
	        }
	    } else {
	        jelem = "<"+name+jattr+" />\n";
	    }
	    return jelem;
	};

	//  method: array_to_xml( tagName, array )

	XML.ObjTree.prototype.array_to_xml = function ( name, array ) {
	    var out = [];
	    for( var i=0; i<array.length; i++ ) {
	        var val = array[i];
	        if ( typeof(val) == "undefined" || val == null ) {
	            out[out.length] = "<"+name+" />";
	        } else if ( typeof(val) == "object" && val.constructor == Array ) {
	            out[out.length] = this.array_to_xml( name, val );
	        } else if ( typeof(val) == "object" ) {
	            out[out.length] = this.hash_to_xml( name, val );
	        } else {
	            out[out.length] = this.scalar_to_xml( name, val );
	        }
	    }
	    return out.join("");
	};

	//  method: scalar_to_xml( tagName, text )

	XML.ObjTree.prototype.scalar_to_xml = function ( name, text ) {
	    if ( name == "#text" ) {
	        return this.xml_escape(text);
	    } else {
	        return "<"+name+">"+this.xml_escape(text)+"</"+name+">\n";
	    }
	};

	//  method: xml_escape( text )

	XML.ObjTree.prototype.xml_escape = function ( text ) {
	    return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
	};
	
	
	// make these utilities available from Underscore.js
	_.mixin({'XML': XML });

	
}());



/*
// ========================================================================

=head1 NAME

XML.ObjTree -- XML source code from/to JavaScript object like E4X

=head1 SYNOPSIS

    var xotree = new XML.ObjTree();
    var tree1 = {
        root: {
            node: "Hello, World!"
        }
    };
    var xml1 = xotree.writeXML( tree1 );        // object tree to XML source
    alert( "xml1: "+xml1 );

    var xml2 = '<?xml version="1.0"?><response><error>0</error></response>';
    var tree2 = xotree.parseXML( xml2 );        // XML source to object tree
    alert( "error: "+tree2.response.error );

=head1 DESCRIPTION

XML.ObjTree class is a parser/generater between XML source code
and JavaScript object like E4X, ECMAScript for XML.
This is a JavaScript version of the XML::TreePP module for Perl.
This also works as a wrapper for XMLHTTPRequest and successor to JKL.ParseXML class
when this is used with prototype.js or JSAN's HTTP.Request class.

=head2 JavaScript object tree format

A sample XML source:

    <?xml version="1.0" encoding="UTF-8"?>
    <family name="Kawasaki">
        <father>Yasuhisa</father>
        <mother>Chizuko</mother>
        <children>
            <girl>Shiori</girl>
            <boy>Yusuke</boy>
            <boy>Kairi</boy>
        </children>
    </family>

Its JavaScript object tree like JSON/E4X:

    {
        'family': {
            '-name':    'Kawasaki',
            'father':   'Yasuhisa',
            'mother':   'Chizuko',
            'children': {
                'girl': 'Shiori'
                'boy': [
                    'Yusuke',
                    'Kairi'
                ]
            }
        }
    };

Each elements are parsed into objects:

    tree.family.father;             # the father's given name.

Prefix '-' is inserted before every attributes' name.

    tree.family["-name"];           # this family's family name

A array is used because this family has two boys.

    tree.family.children.boy[0];    # first boy's name
    tree.family.children.boy[1];    # second boy's name
    tree.family.children.girl;      # (girl has no other sisiters)

=head1 METHODS

=head2 xotree = new XML.ObjTree()

This constructor method returns a new XML.ObjTree object.

=head2 xotree.force_array = [ "rdf:li", "item", "-xmlns" ];

This property allows you to specify a list of element names
which should always be forced into an array representation.
The default value is null, it means that context of the elements
will determine to make array or to keep it scalar.

=head2 xotree.attr_prefix = '@';

This property allows you to specify a prefix character which is
inserted before each attribute names.
Instead of default prefix '-', E4X-style prefix '@' is also available.
The default character is '-'.
Or set '@' to access attribute values like E4X, ECMAScript for XML.
The length of attr_prefix must be just one character and not be empty.

=head2 xotree.xmlDecl = '';

This library generates an XML declaration on writing an XML code per default.
This property forces to change or leave it empty.

=head2 tree = xotree.parseXML( xmlsrc );

This method loads an XML document using the supplied string
and returns its JavaScript object converted.

=head2 tree = xotree.parseDOM( domnode );

This method parses a DOM tree (ex. responseXML.documentElement)
and returns its JavaScript object converted.

=head2 tree = xotree.parseHTTP( url, options );

This method loads a XML file from remote web server
and returns its JavaScript object converted.
XMLHTTPRequest's synchronous mode is always used.
This mode blocks the process until the response is completed.

First argument is a XML file's URL
which must exist in the same domain as parent HTML file's.
Cross-domain loading is not available for security reasons.

Second argument is options' object which can contains some parameters:
method, postBody, parameters, onLoading, etc.

This method requires JSAN's L<HTTP.Request> class or prototype.js's Ajax.Request class.

=head2 xotree.parseHTTP( url, options, callback );

If a callback function is set as third argument,
XMLHTTPRequest's asynchronous mode is used.

This mode calls a callback function with XML file's JavaScript object converted
after the response is completed.

=head2 xmlsrc = xotree.writeXML( tree );

This method parses a JavaScript object tree
and returns its XML source generated.

=head1 EXAMPLES

=head2 Text node and attributes

If a element has both of a text node and attributes
or both of a text node and other child nodes,
text node's value is moved to a special node named "#text".

    var xotree = new XML.ObjTree();
    var xmlsrc = '<span class="author">Kawasaki Yusuke</span>';
    var tree = xotree.parseXML( xmlsrc );
    var class = tree.span["-class"];        # attribute
    var name  = tree.span["#text"];         # text node

=head2 parseHTTP() method with HTTP-GET and sync-mode

HTTP/Request.js or prototype.js must be loaded before calling this method.

    var xotree = new XML.ObjTree();
    var url = "http://example.com/index.html";
    var tree = xotree.parseHTTP( url );
    xotree.attr_prefix = '@';                   // E4X-style
    alert( tree.html["@lang"] );

This code shows C<lang=""> attribute from a X-HTML source code.

=head2 parseHTTP() method with HTTP-POST and async-mode

Third argument is a callback function which is called on onComplete.

    var xotree = new XML.ObjTree();
    var url = "http://example.com/mt-tb.cgi";
    var opts = {
        postBody:   "title=...&excerpt=...&url=...&blog_name=..."
    };
    var func = function ( tree ) {
        alert( tree.response.error );
    };
    xotree.parseHTTP( url, opts, func );

This code send a trackback ping and shows its response code.

=head2 Simple RSS reader

This is a RSS reader which loads RDF file and displays all items.

    var xotree = new XML.ObjTree();
    xotree.force_array = [ "rdf:li", "item" ];
    var url = "http://example.com/news-rdf.xml";
    var func = function( tree ) {
        var elem = document.getElementById("rss_here");
        for( var i=0; i<tree["rdf:RDF"].item.length; i++ ) {
            var divtag = document.createElement( "div" );
            var atag = document.createElement( "a" );
            atag.href = tree["rdf:RDF"].item[i].link;
            var title = tree["rdf:RDF"].item[i].title;
            var tnode = document.createTextNode( title );
            atag.appendChild( tnode );
            divtag.appendChild( atag );
            elem.appendChild( divtag );
        }
    };
    xotree.parseHTTP( url, {}, func );

=head2  XML-RPC using writeXML, prototype.js and parseDOM

If you wish to use prototype.js's Ajax.Request class by yourself:

    var xotree = new XML.ObjTree();
    var reqtree = {
        methodCall: {
            methodName: "weblogUpdates.ping",
            params: {
                param: [
                    { value: "Kawa.net xp top page" },  // 1st param
                    { value: "http://www.kawa.net/" }   // 2nd param
                ]
            }
        }
    };
    var reqxml = xotree.writeXML( reqtree );       // JS-Object to XML code
    var url = "http://example.com/xmlrpc";
    var func = function( req ) {
        var resdom = req.responseXML.documentElement;
        xotree.force_array = [ "member" ];
        var restree = xotree.parseDOM( resdom );   // XML-DOM to JS-Object
        alert( restree.methodResponse.params.param.value.struct.member[0].value.string );
    };
    var opt = {
        method:         "post",
        postBody:       reqxml,
        asynchronous:   true,
        onComplete:     func
    };
    new Ajax.Request( url, opt );

=head1 AUTHOR

Yusuke Kawasaki http://www.kawa.net/

=head1 COPYRIGHT AND LICENSE

Copyright (c) 2005-2006 Yusuke Kawasaki. All rights reserved.
This program is free software; you can redistribute it and/or
modify it under the Artistic license. Or whatever license I choose,
which I will do instead of keeping this documentation like it is.

=cut
// ========================================================================
*/
/* ===================================================
 * js-fileio.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global _: true, $: true */
if (typeof _ === 'undefined') {
	if (typeof exports !== 'undefined') {
		var _ = require('underscore');
	} else {
		var _ = {};
		_.mixin = function(object) {
			"use strict";
			var property;
			for (property in object) {
				if (object.hasOwnProperty(property)) {
					_[property] = object[property];
				}
			}
		};
	}
}


(function() {
	"use strict";
	var http, httpCodes
	, fs
	, fileio = {}
	, browser;

	if (typeof exports !== 'undefined') {
		browser = false;
		http = httpCodes = module.require('http');
		fs = module.require('fs');
	} else {
		browser = true;
	}
	
	// return values from $.ajax
	var  xhrStringValues = {
		'success': function() { return null; },
		'notmodified': function() { return null; },
		'nocontent': function() { return null; },
		'error': function(code) { return new Error('$ajax error ' + code); },
		'timeout': function(code) { return new Error('$ajax timeout ' + code); }, 
		'abort': function(code) { return new Error('$ajax abort ' + code); }, 
		'parsererror': function(code) { return new Error('$ajax error ' + code); } 
	};

	// success codes from httpRequest
	var  httpRequestValues = function (code) {
		if (code < 400) {
			return function() { return null; };
		} else if (typeof httpCodes.STATUS_CODES[code] !== 'undefined') {
			return function(code) { return new Error(httpCodes.STATUS_CODES[code] + ' - ' + code); };
		}
		return function(code) { return new Error('HTTP Request error ' + ' - ' + code) };
	};
	
	var errorResult = function(result, err, reason) {
		result.body = {
			'error': err,
			'reason': reason
		};
		return result;
	};
	
	var HTTP = function(server) {
		var	Basic
		, auth = (server && server.auth && (server.auth.name + ':' + server.auth.password))
		, that = {}
						
		// Media types that parse can handle.
		, parseTypes = {
			'application/json': true,
			'application/hal+json': true,
			'json': true
		}
		
		, formatAuth = function(object) {
			if (typeof object === 'string') {
				return object;
			} else if (typeof object === 'object') {
				return (object.name + ':' + object.password);
			}
		}

		// Purpose: parses a JSON object with 'catch' 
		// to just return the input if the parse fails.
		, parse = function (s, responseType) {
			var parsed = {}
			, contentType = (typeof responseType !== 'undefined') 
				? responseType.split(';')[0] 
				: undefined;
			
			if (s === '') {
				return '';
			} 
			if (parseTypes.hasOwnProperty(contentType) && parseTypes[contentType]) {
			
				// ajax sometimes returns .html from the root directory
				if (s.toUpperCase().substr(2,8) === "DOCTYPE") {
					return s;
				} 
				try {
					parsed = JSON.parse(s);
				} catch (e) {
					return s;
				}
				return parsed;
			}
			return s;					
		};

		var nodeGet = function (opts, callback) {
			//console.log('file-utils nodeGet', opts, formatAuth(opts.auth || auth), typeof callback);
			var stream = ''
			, req;
			
			if (opts && opts.protocol && opts.protocol === 'https:') {
				http = require('https');
			}
			
			// Calculate Basic authentication.
			// Do this here and not outside, since its only for node.js
			if (opts.auth || auth) {
				Basic = "Basic " + new Buffer(formatAuth(opts.auth || auth), "ascii").toString("base64");
			}
			
			req = http.request(opts, function(res) {
				//console.log('nodeGet rquest', typeof res);				
				res.setEncoding('ascii');
				res.on('data', function (chunk) {
					stream = stream + chunk;
				});
				res.on('end', function() {
					//console.log('nodeGet on end', res.statusCode);
					// callback pattern
					if (callback && typeof callback === 'function') {
							callback(httpRequestValues(res.statusCode)(res.statusCode), {
								request: _.omit(_.extend({}, opts), 'agent', 'auth'),
								code: res.statusCode,
								header: res.headers,
								href: opts.href,
								body: parse(stream, res.headers['content-type'])
							}, res);
					}
				});			
			});

			// if Basic, the update the request header
			if (Basic) {
				req.setHeader('Authorization', Basic);
			}
			
			// update request headers with request from client
			if (opts.headers) {
				_.each(opts.headers, function(value, key) {
					req.setHeader(key, value);
				});
			}

			req.on('error', function(e) {
				if (callback && typeof callback === 'function') {
					callback(e, errorResult({}, 'failed-request', (e && e.message) || e));
				}
			});
			// if body is an object, request object expects 'body' to be stringified.
			if ((typeof opts.body !== 'undefined') && (opts.method === 'PUT' || opts.method === 'POST')) {
				if (opts.body) {
					if (typeof opts.body !== 'string') {
						opts.body = JSON.stringify(opts.body) 
					}
				} else {
					opts.body = '';
				}
				req.write(opts.body);
			}
			req.end();
		};

/*
processData: false _config, {dbname}, 
save: before send fullcommit options
*/	
		
		var jqueryGet = function (opts, callback) {
			var defaultAjaxOpts = { 
					'accepts': {'json': 'application/json' },
					'dataType': "json",			
					'contentType': "application/json",
					'headers': {
						"Accept": "application/json"
					}
				}
			// Purpose: jQuery ajax call returns header string. 
			// Parse it into an object, remove leading spaces from key/value	
			, parseHdr = function (hdr) {
				var parseArray = hdr.split('\n')
					,header = {};
				_.each(parseArray, function(element) {
					var hdrItem = element.split(':');
					if (hdrItem.length > 1 && hdrItem[0] !== '') {
						header[hdrItem[0].toLowerCase()] = hdrItem[1].replace(' ','');																		
					}
				});
				return (header);
			};

			// extend the options with the defaults, and the ajax logic
			opts = _.extend(defaultAjaxOpts, opts, {	
				beforeSend: function(xhr) {
					_.each(opts.headers, function(item, index) {
						xhr.setRequestHeader(index, item);						
					});
		        },
		        complete: function(jqXHR, xhrString) {			
					//var resp = httpData(req, "json");
					if (callback && typeof callback === 'function') {
						callback(xhrStringValues[xhrString](jqXHR.status), {
							request: _.omit(opts, 'agent', 'auth'),
							method: opts.type,
							code: jqXHR.status,
							jqXHR: jqXHR,
							header: parseHdr(jqXHR.getAllResponseHeaders()),
							body: parse(jqXHR.responseText, this.dataType)
						});
					}
				}
			});
			$.ajax(opts);
		};

		// Purpose: manages parameters for differing ajax interfaces, such as node.js and jquery
		var get = function(opts, callback) {
			if (typeof opts === 'string') {
				opts = _.urlParse(opts)
			}
			// extend opts with any options provided when this object was created
			opts = _.extend(server || {}, opts);

			// if opts has no 'protocol' then just read the file from the local file system
			if (!opts.hasOwnProperty('protocol')) {
				return fileio.readFile(opts, callback);
			}
			
			if (browser === true) {
				// data objects are strings for PUT. 
				if (opts.method && (opts.method==='PUT' || opts.method==='POST')) {	
					// check the content type first
					if (_.fetch(opts, ['Content-Type', 'content-type']) === 'application/x-www-form-urlencoded') {
						_.extend(opts, { 'data': opts.body || {}, 'processData': false });
					} else {
						_.extend(opts, { 'data': (JSON.stringify(opts.body || {})).replace(/\r/g, '') });
					}	
				} 
								
				jqueryGet({
					'url': typeof opts==='string' ? opts : ((opts && opts.path) || ''),
					'type': opts.method,
					'contentType': _.fetch(opts, ['Content-Type', 'content-type']) || 'application/json',
					'headers': opts.headers,
					'data': opts.data }, callback);
			} else {
				nodeGet(opts, callback);
			}
		};
		that.get = get;

		var Xml = function() {
			var that = {}
			, xotree = new _.XML.ObjTree();
				
			var force_array = function(opts) {
				if (_.isArray(opts)) {
					xotree.force_array = opts;									
				} else {
					throw new Error('Xml.force_array: force_array arguments must be an array');
				}
				return this;
			};
			that.force_array = force_array;

			var xml2json = function (xmlstr) {
				var tree = {}
				, err = null;

				try {
				    tree = xotree.parseXML(xmlstr);				
				} catch (e) {
					err = new Error(' [ XML2JSON ] -' + e);				
				}
				
				return({
					'tree': tree,
					'json': JSON.stringify(tree),
					'xml': xmlstr
				});
			};
			that.xml2json = xml2json;

			var toJson = function (url, func) {
				var json;
									
				get(url, function(err, result) {
					if (err) {
						return func(err,errorResult({}, 
												'failed-request', (err && err.message) || err));
					}
					json = xml2json(result.body);
					func(null, _.extend(result, {
						'tree': json.tree,
						'json': json.json,
						'xml': json.xml
					}));					
				});
				return this;
			};
			that.toJson = toJson;
			
			that.get = get;
			return that;
		};
		that.Xml = Xml;
		return that;
	};
	fileio.HTTP = HTTP;
		
	var writeFile = function(f, data, handler) {		
		fs.writeFile(f, data, function (err) {
			if (handler && typeof handler === 'function') {
				handler(err);
			}
		});
	};
	fileio.writeFile = writeFile;

	var readFile = function(request, myhandler) {
		var handler = (myhandler && myhandler.fn) || myhandler
		, fullPath = (request.root || '') + (request.href || '');

		if (browser === true) {
			$.ajax({
				'url': fullPath,
				'type': 'GET',
				'dataType': 'text',
				'complete': function(data, err) {
					if (handler && typeof handler === 'function') {
						handler(xhrStringValues[err](err), {
							'request': request,
							'code': err === 'success' ? 200 : err,
							'href': fullPath,
							'body': data,
							'data': data
						});
					}
				}
			});
		} else {
			fs.readFile(fullPath, 'ascii', function (err, data) {
				handler(err, {
					'request': request,
					'code': (err && err.code) || 200,
					'href': fullPath,
					'body': data,
					'data': data
				});
			});			
		}	
	};
	fileio.readFile = readFile;

	var readCSV = function (sourceFile, delimit, handler) {
		var that = {}
			, delimiter = delimit || ',';
		
		var process = function (arg) {
			var data = sourceFile || arg
				, lines = []
				, header = []
				, nextLine = function () {
					return({});
				}
				, thisLine
				, line
				, currentLine
				, j;

			try {
				// parsing a delimter separated file. Consider first line as header,
				// use the tokens as keys for each remaining line.
				lines = data.split('\n');
				header = lines[0].split(delimiter);

				// for each line, beginning with line 1 (line 0 is the header)
				for (currentLine = 1; currentLine < lines.length; currentLine += 1) {
					line = lines[currentLine].split(delimiter);
					if (line.length !== header.length) {
						throw new Error('readCSV(): invalid-delimiter - '+ currentLine);
					} else {
						// for each field, generate an entry name: field
						thisLine = nextLine();
						for (j = 0; j < header.length; j += 1) {
							thisLine[header[j]] = line[j]; 
						}
						// call the handler with an object for each line
						if (handler && typeof handler === 'function') {
							handler(header, thisLine, currentLine===(lines.length-1));
						}
					}
				} 
			} catch (e) {
				//throw ('json parse error', e);
				throw new Error('readCSV.process(): processing CSV file, ' + e);
			}				
		};
		that.process = process;

		var read = function () {
			readFile(sourceFile, function(err, data) {
				if (err !== null) {
					throw new Error('readCSV.read(): Bad source file - ' + err.message);
				} else {
					process(data);
				}
			});				
		};
		that.read = read;
		return that;
	};
	fileio.readCSV = readCSV;
	
	var Config = {
		'server': {
			"root":"http://",
			"host":"localhost",
			"port":"5984" },
		'file': {
			"root": "/Users"			
		}
	};
	
	var server = function (type, URL) {
		var parsedURL = (URL && (_.isObject(URL) ? URL : _.urlParse(URL)));
//		var parsedURL = (URL && (_.isObject(URL) ? URL : _.urlParse(URL))) || Config[type || 'server'];
		return HTTP(parsedURL).Xml();	
	};
	fileio.server = server;
	
	// make these utilities available from Underscore.js
	_.mixin(fileio);
	
}());

/* ===================================================
 * boxspring-models.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global _: true, Boxspring: true, Backbone: true, $: true, jQuery: true */
"use strict";


if (typeof _ === 'undefined') {
	if (typeof exports !== 'undefined') {
		_ = require('underscore');
	} else if (typeof _ === 'undefined') {
		throw new Error('Boxspring.js requires Underscore.js');
	}
}

if (typeof _.Boxspring === 'undefined') {
	_.Boxspring = {};	
}

(function (global) {
	// What it does: Backbone Model wrapper for BoxspringJS Document object.
	var Doc = Backbone.Model.extend({
		'idAttribute': '_id',
		'initialize': function (config) {
			var model = this;
			
			// get the Boxspring document
			this._doc = config._doc;
			
			// populate the attributes of this Model
			_.each(this._doc.post(), function(value, key) {
				model.set(key, value);
			});
			
			// replace Backbone sync with this. Boxspring document now has all the attributes
			// of a Backbone document.
			this.sync = function(method, model, options) {
				model._doc.sync.call(model, method, model.attributes, options);		
			};
		}
	});
	
	var doc = function(db, id) {
		return new Doc({'_doc': db.doc(id) });
	};
	global.Doc = Doc;
	
	
	// What it does: Provides methods to 'fetch' from the server and relay 'completed', 'result', 
	// and 'more-data' events to clients. 
	var Query = Backbone.Model.extend({
		'defaults': {
			'options': {
				// query parameters
				'stale': undefined,
				'include_docs': undefined,
				'reduce': false,
				'limit': undefined,
				'startkey': undefined,
				'endkey': undefined,
				'group_level': undefined,
				'descending': false,
				'key': undefined,
				'keys': undefined
			}
		},
		'initialize': function (config) {
			var model = this;
			
			// used by fetch() to filter valid Couchdb query options.
			this.params = _.keys(this.defaults.options);
						
			this.view = config && config.view;
			if (config && config.options) {
				_.each(config.options, function(value, key) {
					model.set(key, value);
				});
			}
			if (config && config.system) {
				this.view.system.update(config.system);
			}
			// make the system config visible to this Model
			this.system = this.view.system;

			// create a query id for this, mostly for debugging 
			this.qid = _.uniqueId('q');

			// when we see an event on the query, propagate a change event on the model.
			['result', 'more-data', 'completed'].forEach(function(tag) {
				model.on(tag, function(result) {
					model.set(tag, result);
				});
			});
		},
		// Response Wrapper: wraps the response object with methods and helpers to manage 
		// the flow of data from the server to the application
		'result': function () {					
			var owner = this || {} 
			, queryPages = { 'pages': [] }
			, current_chunk = 0
			, current_page = 0;	// zero-based

			// wraps the response.body object with some helper methods
			var data = function (response) {
				// helpers						
				response.query = owner;
				response.rid = _.uniqueId('r');

				var pages = function () {
					return _.clone(queryPages.pages);
				};

				var page = function () {					
					if (current_chunk > 0) {
						// does not create a new 'pages', returns to tha caller the cached
						// response object from the server
						return queryPages.pages[current_chunk];
					}
					return queryPages.pages[0];
				};
				response.page = page;

				// return a paginated query as though it was captured in one block; retain the meta
				// (offset, total_rows, etc.) from the current page captured
				var unPaginate = function () {
					var allPages;
					
					allPages = _.extend({}, this.page(), { 'body': { 'rows': [] }});
			
					// concatenate all the rows found up to now
					pages.apply(this).forEach(function(page) {
						allPages.body.rows = 
							allPages.body.rows.concat(_.clone(page.body.rows) || []);
					});
					// update the offset, total_rows; and return;
					allPages.body.offset = 0;
					allPages.body.total_rows = this.page().total_rows();
					return allPages;
				};
				response.unPaginate = unPaginate;
				
				var paginate = function () {
					var oneChunk = function(result, offset, len) {
						var onePage = _.extend({}, result.page(), { 'body': { 'rows': [] }});
						
						onePage.body.rows = result.body.rows.slice(offset, offset+len);
						onePage.body.offset = offset;
						onePage.body.total_rows = result.getLength();
						return onePage;
					}
					, offset
					, newPages = [];
					
					// reset the queryPages
					for (offset = 0; offset < this.getLength(); offset += this.pageInfo().pageSize) {
						newPages.push(oneChunk(this, offset, this.pageInfo().pageSize))
					}
					current_chunk = 0;
					current_page = 0;
					queryPages.pages = newPages;
					return queryPages.pages[0];
				};
				response.paginate = paginate;
				
				var pageInfo = function () {
					var local = this;

					return ({ 
						'completed': (local.total_rows() === (local.offset() + local.getLength())),
						'totalRows': local.total_rows(),
						'pageSize': (owner.system.get('page-size') || this.totalRows),
						'cachedPages': queryPages.pages.length, 
						'page': current_page + 1,
						'next': function() {
							current_chunk += (current_chunk < queryPages.pages.length-1) ? 1 : 0;
							if (current_page < Math.floor(this.totalRows / this.pageSize)) {
								current_page += 1;
							}
							return this;
						},
						'prev': function() {
							current_chunk -= (current_chunk > 0) ? 1 : 0;
							if (current_page > 0) {
								current_page -= 1;
							}
							return this;
						},
						'pages': function() { 
							return Math.ceil(this.totalRows / this.pageSize); 
						},
						'lastPage': function() { 
							return queryPages.pages.length; 
						} 
					});
				};
				response.pageInfo = pageInfo;

				// What it does: caller supplied or callback from menus to render rows and 
				// update the browser with spinning wheel and alerts
				var nextPrev = function (arg) {
					var direction = _.trim(( (arg && typeof arg === 'string') ? arg : arg && arg.text ));

					if (direction) {
						direction = direction.toLowerCase().split(' ');
					}
					if (!direction) {
						current_chunk = 0;
						this.query.trigger('result', page.apply(this));
						return this;	
					} 

					if (_.found(direction, 'next')) {
						this.pageInfo().next();	
						this.query.trigger('result', page.apply(this));
						// if we haven't cached all the pages, and we have one more page in
						// cache before we run out, then cache another page from the server 
						if (!this.pageInfo().completed && 
							(this.pageInfo().page) === (this.pageInfo().lastPage()-1) &&
							(_.isFunction(page.apply(this).moreData))) {
								// moreData is a closure with all information needed for the 
								// next chunk of data
								page.apply(this).moreData();
						}
					} else if (_.found(direction, 'previous')) {
						this.pageInfo().prev();	
						this.query.trigger('result', page.apply(this));
					}
				};
				response.nextPrev = nextPrev;

				//console.log(response.query.qid, owner.system.get('asynch'),
				// queryPages.pages.length);
				// updates the pages cache
				queryPages.pages.push(response);	
				// accumulates the rest of the pages for this result, if 'asynch'
				// when asynch=true, relay the data to the listener
				if (owner.system.get('asynch') === true && 
					queryPages.pages.length > 1) {
					
					if (response.pageInfo().completed) {
						//console.log('completed', response.pageInfo().completed);
						owner.trigger('completed', response);
					} else {
						owner.trigger('more-data', response);
					}
				}
				
				// if 'page-size' was set, but this response came thru with all rows, then 
				// enable pagination here
				if (response.getLength() > owner.system.get('page-size')) {
					return response.paginate();
				}
				return response;
			};
			queryPages.body = data;
			return data;
		},
		'fetch': function(options) {
			var model = this;
			
			// if system control parameters (page-size, cache-size, ...) were passed in,
			// update them 
			if (options && options.system) {
				model.system.update(options.system);
			}
			
			// update this model with the supplied options
			_.each(options, function(value, key) { model.set(key, value); });
			
			// initiate the fetch;
			model.view.fetch(_.pick(model.attributes, this.params), 
			function(err, result) {
				if (err) {
					return model.set('error', (result && result.body || err));
				}
				// trigger the initial result 
				model.trigger('result', result);
				// NOTE: 'this.result' is a Result() object	passed into the 
				// view to capture additional results, after the first one is set.	
			}, this.result(model));
			return this;
		}
	});
	
	var query = function(view, system) {
		return new Query({'view': view, 'system': system });
	};
	global.Query = query;
	
	
	// helper function to form db object
	var dbhelper = function(name, auth) {
		return({'name': name, 'auth': auth });
	};
		
	var Users = Backbone.Model.extend({
		defaults: {
			'name': '',
			'password': '',
			'db_name': '',
			'roles': [],
			'userDb': {},
			'loggedIn': false,
			'error': null
		},
		initialize: function (db) {
			this.owner = _.clone(db);
			this.set('auth', {'name': '', 'password': ''});
		},
		auth: function() {
			return (this.get('auth') || {
				'name': this.get('name'), 
				'password': this.get('password') 
			});
		},
		error: function(err, response) {
			return this.set('error', {'err': err, 'response': response });			
		},
		signup: function() {
			var mydb = this.owner.users('_users', this.get('auth').name)
			, model = this;
	
			mydb.signUp(this.get('auth').password, 
						this.get('roles'), function(err, response, userDb) {
				if (err) {
					return model.error(err, response);
				}
				model.set('userDb', userDb);
				model.set('loggedIn', true);
			});
		},
		login: function() {
			var model = this
			, userDb = this.owner.set('auth', this.auth()).use();
			
			userDb.login(function(err, response) {
				if (err) {
					return model.error(err, response);
				}
				model.set('userDb', userDb);
				model.set('loggedIn', response.code === 200);
			});
		},
		logout: function() {
			var model = this;
			
			// only if we're already logged in. otherwise do nothing.
			if (this.get('loggedIn')) {
				this.get('userDb').logout(function(err, response) {
					if (err) {
						model.error(err, response);
					}
					model.set('userDb', undefined);
					model.set('loggedIn', (response.code !== 200));
				});				
			}
		},
		update: function(newPassword) {
			var model = this
			, userDb = this.get('userDb')
			, name = this.get('auth').name;
			
			model.set('updated', false);
			if (this.get('loggedIn')) {	
				userDb.users('_users', name).update(newPassword, [], function(err, res) {
					if (err) {
						return (model.error(err, res));
					}
					model.set('updated', true);
					//model.logout();
				});					
			} else {
				console.log('you must be logged in!');
			}
		},
		remove: function(userName) {
			var model = this
			, userDb = this.get('userDb');
			
			if (this.get('loggedIn')) {
				userDb.users('_users', userName).remove(function(err, res) {
					// this operation doesn't change the login status of the administrator
					// set the variable and let the application decide what to do with the results.
					if (err) {
						model.error(err, res);						
					}
					model.set('removed', res.code);
				});				
			}
		}
	});
	// make this Model visible to the outside world
	global.Users = Users;
	
}(Boxspring));
/* ===================================================
 * boxspring.js v0.01
 * https://github.com/rranauro/base-utilsjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global Boxspring: true, _: true */

if (typeof _ === 'undefined') {
	throw new Error('Boxspring.js requires Underscore.js');
}

(function(template) {
	"use strict";
		
	// Current version.
	template.VERSION = '0.0.1';
	// add 'boxspring' to the template
	template.Boxspring = template;	
		
	var Boxspring = function () {
		return this;
	}
	
	Boxspring.prototype.create = function () {
		var object = new Boxspring();
		object = _.extend(object, template);
			
		// createdb.apply returns a new database object with the supplied arguments
		return template.createdb.apply(object, arguments);
	};
	
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = new Boxspring().create;
	} else {
		this.Boxspring = new Boxspring().create;
	}

}).call(this, Boxspring);
