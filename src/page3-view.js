(function(global){
	
	var PageThree = Backbone.View.extend({      //select sites window view
	
		el: '#page3',
		model: global.mainmodel,	
		events: {
		    "click .previous-button":"prePage",
			"click .next-button":"nextPage",
			"click .startover-button":"startover",
		},		
		initialize: function(){
			global.mainmodel.on('change:tableData', function(){
				var data = global.mainmodel.get('tableData');
				if(data!==""){
					var template;
					for(var i=0;i<10;i++){					
						template +=  _.template($("#table-row-template").html(), {num: i, col1: data[i].id, col2: data[i].issn, col3: data[i].pubdate});	
					}				
					$(".table-data").html(template);	
					$(".table-row").click(function(){
						var index = $(this).attr('id').substring(4);
						$(".modal").find(".row-title").html(data[index].id+" Content");
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
			$(".table-data").html("");
			global.mainmodel.set('mainWindow', 'page1');
		}
	});
	
	global.PageThree = PageThree;

}(BX));







