import React, { memo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CloseCircleOutlined } from '@ant-design/icons';
import { Tabs, Spin, message, Popover, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { useRequest } from '@src/hook';
import { createId } from '@src/utils';
import Search from './Components/Search';
import Container from '../Container';
import SwaggerList from './Components/SwaggerList';
import ProjectDirs from './Components/ProjectDirs';
import getTags from './getTags';

import './less/index.less';

const { TabPane } = Tabs;

const NoSwagger = () => {
  return (
    <Container title="Swagger">
      <div className="swagger-error">
        您当前还没有配置Swagger，去 <Link to="/config">配置</Link> 。
      </div>
    </Container>
  );
};

const colors = ['#CCCCFF', '#CCFFFF', '#FFCCCC', '#FFCC99', '#99CCCC'];
// const colors = ['#FFFFCC','#CCFFFF','#FFCCCC','#FFCC99','#CCFF99','#CCCCCC','#FFCCCC','#CCCCFF','#CCFFCC','#99CCCC','#FFCC99','#FFCCCC','#FFCC99','#FFFFCC','#99CCCC'];

export default memo(() => {
  const history = useHistory();
  const [tabsId, setTabsId] = useState('');
  const { data, error, loading: loadingGet } = useRequest<any[]>('/api/config/swagger/get');
  const [form] = Form.useForm();

  const { data: swaggerData, loading: loadingSwagger, request: requestSwagger } = useRequest<any>('/api/swagger/info', { lazy: true });

  const { request: requestSearchSwagger } = useRequest<any>('/api/swagger/search', { lazy: true });

  const [swaggerList, setSwaggerList] = useState<{ name: string; description: string; id: string }[]>([]);
  const [expandData, setExpandData] = useState<Record<string, any>>({});
  const [loadingId, setLoadingId] = useState(''); // 子列表loading
  const [expandCacheId, setExpandCache] = useState<string[]>([]); // 缓存已展开的列表id
  const [selectId, setSelectId] = useState<string[]>([]); // 已选中的api

  // useEffect(() => {
  //   if (data && data.length > 0) {
  //     setTabsId(data[0].id);
  //   }
  // }, [data]);

  useEffect(() => {
    if (swaggerData && Array.isArray(swaggerData.tags)) {
      setSwaggerList(getTags(swaggerData));
      // setSwaggerList(swaggerData.tags.map((item: any) => ({ ...item, id: createId(8) })));
    } else {
      setSwaggerList([]);
    }
  }, [swaggerData]);

  // useEffect(() => {
  //   if (tabsId) {
  //     const searchName = form.getFieldValue('name');
  //     setSelectId([]);
  //     if (!searchName) {
  //       requestSwagger({ id: tabsId });
  //     } else {
  //       onFinish({ name: searchName });
  //     }
  //   }
  // }, [tabsId]);

  const onTabClick = (id: string, name: string) => {
    // setTabsId(key);
    history.push(`/swagger/${id}`, { title: `<Api>${name}` });
  };

  // 展开子列表
  const onClickSwaggerHead = (item: any) => {
    if (expandCacheId.includes(item.id)) {
      setExpandCache(expandCacheId.filter((id) => id !== item.id));
      return;
    }

    if (expandData[item.id]) {
      setExpandCache([...expandCacheId, item.id]);
      return;
    }

    setLoadingId(item.id);

    requestSearchSwagger({
      configId: tabsId,
      searchTag: item.name
    })
      .then((res: any) => {
        setLoadingId('');
        if (typeof res === 'object' && Object.keys(res || {}).length > 0) {
          const newData: any = {};
          Object.keys(res).forEach((key) => {
            const val = res[key];
            newData[key] = {
              description: val.description,
              methods: val.methods,
              request: val.request,
              response: val.response
            };
          });
          setExpandCache([...expandCacheId, item.id]);
          setExpandData({
            ...expandData,
            [item.id]: newData
          });
        } else {
          message.warning('没有数据');
        }
      })
      .catch(() => {
        setLoadingId('');
      });
  };

  // 表单搜索
  const onFinish = (val: { name: string }) => {
    const { name } = val;
    if (name === undefined || name === '') {
      requestSwagger({ id: tabsId });
    } else {
      const id = createId(8);
      setSwaggerList([{ name, description: '', id }]);
      setExpandCache([id]);
      setLoadingId(id);
      // setSelectId([]);

      const reg = /[\u4e00-\u9fa5]+/g;
      const query = name.toLocaleUpperCase().startsWith('V') || reg.test(name) ? { searchTag: name } : { searchPath: name };

      requestSearchSwagger({
        configId: tabsId,
        ...query
      }).then((res: any) => {
        setLoadingId('');
        if (typeof res === 'object' && Object.keys(res || {}).length > 0) {
          const newData: any = {};
          Object.keys(res).forEach((key) => {
            const item = res[key];
            newData[key] = {
              description: item.description,
              methods: item.methods,
              request: item.request,
              response: item.response
            };
          });
          setExpandData({
            [id]: newData
          });
        } else {
          message.warning('没有数据');
        }
      });
    }
  };

  if (loadingGet) {
    return (
      <Container title="Swagger">
        <Spin />
      </Container>
    );
  }

  if (error || !Array.isArray(data) || data.length === 0) {
    return <NoSwagger />;
  }

  const clearSelectId = (path?: string) => {
    if (path) {
      setSelectId(selectId.filter((p) => p !== path));
    } else {
      setSelectId([]);
    }
  };

  const content = (
    <div className="popover-selected">
      <a onClick={() => clearSelectId()}>清空所有</a>
      {selectId &&
        selectId.map((path) => (
          <p key={path}>
            {path}{' '}
            <span onClick={() => clearSelectId(path)} title="移除">
              <CloseCircleOutlined />
            </span>
          </p>
        ))}
    </div>
  );

  let colorIndex = 0;

  return (
    <Container isMain title="Swagger" className="ui-swagger-container">
      {/* <Tabs className="tabs-oumi" type="card" defaultActiveKey={tabsId} onTabClick={onTabClick}>
        {data && data.map((item) => <TabPane tab={item.name} key={item.id} />)}
      </Tabs> */}

      <div className="swagger-menu-list">
        {data &&
          data.map((item) => {
            if (colorIndex > colors.length - 1) {
              colorIndex = 0;
            }
            const color = colors[colorIndex];
            colorIndex++;
            return (
              <div
                key={item.id}
                style={{ background: color }}
                className={`swagger-menu-list__item ${tabsId === item.id ? 'active' : ''}`}
                onClick={() => onTabClick(item.id, item.name)}
              >
                {item.name}
              </div>
            );
          })}
      </div>
    </Container>
  );
});
