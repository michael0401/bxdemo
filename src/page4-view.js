(function(global){
	
	var PageFour = Backbone.View.extend({      //select sites window view
	
		el: '#page4',
		model: global.mainmodel,	
		events: {
		    "click .previous-button":"prePage",
			"click .next-button":"nextPage",
			"click .startover-button":"startover",
		},		
		initialize: function(){
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
			global.mainmodel.on('change:tableData', function(){
				
				var data = global.mainmodel.get('tableData');
				var header = global.mainmodel.get('columnData');
				if(data!==""){
					$(".table-data").html("");
					var row_template;
					var col_template;
					for(var i=0;i<10;i++){					
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
		prePage:function(){
			global.result.nextPrev('previous');
		},
		nextPage:function(){
			global.result.nextPrev('next');
		},
		startover:function(){
			$(".table-header").html("");
			$(".table-data").html("");
			global.mainmodel.set('columnData', "");
			global.mainmodel.set('mainWindow', 'page1');
		}
	});
	
	global.PageFour = PageFour;

}(BX));







