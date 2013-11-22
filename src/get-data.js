(function(global){
	
	var getData = function(page_size, cache_size){
		
		var auth = { name: "yourusername", password: "yourpassword" }  //database username and password
		, Maker = Boxspring().set({'db_name': 'bxdemo', '_design': 'my-design', '_view': 'my-view', 'auth': auth });  //initialize boxspringJS
	
		var ddoc = function () {		//build document file
			return ({
				"updates": {
					"my-commit": function (doc, req) {
						doc['last-updated'] = Date();
						doc.size = JSON.stringify(doc).length;
						doc.junk = 'another-try';
						doc.body = req && req.body;
						return [doc, JSON.stringify(doc)];
					}
				},
				'types': {
					'_id': ['string', 1],
					'_rev': ['string', 1],
					'doc': ['object', 4],
					'content': ['string', 2],
					'more-content': ['string', 2]			
				},
				"views": {
					'lib': {
						// formats is used by the cell object to provide domain specific formatting
						// of data base on the data type.
						'formats': function() {
							var formatter = function(name) {
								return 'formatted: ' + name;
							}
							return({
								'_id': formatter,
								'_rev': formatter
							});
						}
					},
					'my-view': {
						'map': function (doc) {
							if (doc && doc._id) {
								emit(doc._id, doc);
							}
						},
						'header': {
							'sortColumn': 'doc',
							'keys': ['_id'],
							'columns': ['_id', 'doc', 'content', 'more-content', '_rev']
						}
					}
				}
			});
		}
	
		var anotherdb = Maker.set('maker', ddoc).use();   //initialize database 
		var design = anotherdb.design('_design/my-design');		//build design file
		var pages
		, page
		, query = anotherdb.Query(anotherdb.view(),
						{'asynch': true, 'page-size': page_size, 'cache-size': cache_size, 'delay': 1/100 });
		//use design file to get the data from database
		design.update(function(err, response) {
		
			query.on('result', function(result) {				
				BX.result = result;
				var dataArray=[];
				var data = {};		
				for(var i=0;i<page_size;i++){
					data = {};
					data.docID = result.body.rows[i].value['_id'];
					data.dochead = result.body.rows[i].value.content.art.fm.dochead;
					data.issn =result.body.rows[i].value.content.art.fm.bibl.issn;
					data.pubdate = result.body.rows[i].value.content.art.fm.bibl.pubdate;
					data.volume = result.body.rows[i].value.content.art.fm.bibl.volume;
					data.fpage = result.body.rows[i].value.content.art.fm.bibl.fpage;
					data.issue = result.body.rows[i].value.content.art.fm.bibl.issue;
					data.url = result.body.rows[i].value.content.art.fm.bibl.url;
					data.source = result.body.rows[i].value.content.art.fm.bibl.source;
					data.content=result.body.rows[i].value.content;
					dataArray.push(data);
				}
				global.mainmodel.set('tableData', dataArray);
			});
			//fetch will trigger the result event, so will page-next and page-prev
			query.fetch();
		});			
	}
	global.getData = getData;	
	
}(BX));