(function(global){
	/*
	table page
	*/
	var PageFour = Backbone.View.extend({      //select sites window view
	
		el: '#page4',
		model: global.mainmodel,	
		events: {
		    "click .previous-button":"prePage",  	 	//previous page button of table
			"click .next-button":"nextPage",			//next page button of table
			"click .startover-button":"startover",		//startover button
			"click .back-button":"backFunction"			//back button
		},		
		initialize: function(){
			
			//change event on columnData attribute of main model, which will change the columns of table
			global.mainmodel.on('change:columnData', function(){
				var header = global.mainmodel.get('columnData');
				var template;
				if(header!==""){
					_.each(header, function(head){
						template +=  _.template($("#table-header-template").html(), {header: head});	
					});
					$(".table-header").html(template);
				}			
			});
			
			//change evern on tableData attribute of main model, which will change the data of table
			global.mainmodel.on('change:tableData', function(){				
				var data = global.mainmodel.get('tableData');
				var header = global.mainmodel.get('columnData');
				if(data!==""){
					$(".table-data").html("");
					var row_template;
					var col_template;
					var page_size = global.mainmodel.get('pageSize');
					for(var i=0;i<page_size;i++){					
						row_template =  _.template($("#table-row-template").html(), {num: i});
						$(".table-data").append(row_template);	
						_.each(header, function(head){
							col_template =  _.template($("#table-header-template").html(), {header: data[i][head]});	
							$("#row-"+i).append(col_template);	
							
						});					
					}									
					$(".table-row").click(function(){
						var index = $(this).attr('id').substring(4);
						$(".modal").find(".row-title").html(data[index].docID+" Content");
						$(".modal").find(".row-content").html(data[index].content);
						$('.modal').modal('show')
					});		
				}			
			});
		},
		prePage:function(){		//go to table data previous page
			global.result.nextPrev('previous');
		},
		nextPage:function(){	//go to table data next page
			global.result.nextPrev('next');
		},
		startover:function(){	//go back to page1
			$(".table-header").html("");
			$(".table-data").html("");
			global.mainmodel.set('columnData', "");
			global.mainmodel.set('tableData', "");
			global.mainmodel.set('mainWindow', 'page1');
		},
		backFunction:function(){	//go back to page3
			$(".table-data").html("");
			global.mainmodel.set('tableData', "");
			global.mainmodel.set('mainWindow', 'page3');
		}
	});
	
	global.PageFour = PageFour;

}(BX));







